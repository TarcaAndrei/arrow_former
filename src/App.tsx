import React, { useState } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import './App.css';

const App: React.FC = () => {
    const allClasses = [
        'Turn Around', 'Left', 'Left Right', 'Right', 'Slight Left',
        'Slight Right', 'Straight Left Right', 'Straight', 'Straight Left', 'Straight Right'
    ];

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [imageOutput, setImageOutput] = useState<string | null>(null);
    const [videoOutput, setVideoOutput] = useState<string | null>(null);
    const [videoDownloadLink, setVideoDownloadLink] = useState<string | undefined>(undefined);
    const [zipDownloadLink, setZipDownloadLink] = useState<string | null>(null);
    const [confidence, setConfidence] = useState<number>(0.9);
    const [fps, setFps] = useState<number>(15);
    const [modelSelector, setModelSelector] = useState<string>('small');
    const [selectedClasses, setSelectedClasses] = useState<string[]>(allClasses);
    const [selectedTab, setSelectedTab] = useState<'image' | 'video'>('image');
    const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
        }
    };

    const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setVideoFile(file);
        }
    };

    const handleConfidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setConfidence(parseFloat(event.target.value));
    };

    const handleFpsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFps(parseInt(event.target.value));
    };

    const handleClassChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSelectedClasses((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
        );
    };

    const handleModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setModelSelector(event.target.value);
    };

    const handleImageDetect = async () => {
        if (!imageFile) {
            alert('Please upload an image file');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('confidence_model', confidence.toString());
        formData.append('model_selector', modelSelector);

        selectedClasses.forEach((cls) => {
            formData.append('clase_interes', cls);
        });

        try {
            const response = await axios.post('https://your-backend-endpoint/detect/image/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });
            const imageURL = URL.createObjectURL(response.data);
            setImageOutput(imageURL);
        } catch (error) {
            console.error('Error detecting image:', error);
            alert('Error processing image');
        }
    };

    const handleVideoDetect = async () => {
        if (!videoFile) {
            alert('Please upload a video file');
            return;
        }

        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('confidence_model', confidence.toString());
        formData.append('fps', fps.toString());
        formData.append('model_selector', modelSelector);

        selectedClasses.forEach((cls) => {
            formData.append('clase_interes', cls);
        });

        setIsProcessingVideo(true);

        try {
            const response = await axios.post('https://your-backend-endpoint/detect/video/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });

            const zip = await JSZip.loadAsync(response.data);
            const videoEntry = zip.file('output_video.mp4');
            if (!videoEntry) {
                console.error('output_video.mp4 not found inside zip');
                alert('Processed video missing in response');
                setIsProcessingVideo(false);
                return;
            }

            const arrayBuffer = await videoEntry.async('arraybuffer');
            const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
            const videoURL = URL.createObjectURL(videoBlob);
            setVideoDownloadLink(videoURL);

            const annotationZipBlob = new Blob([response.data], { type: 'application/zip' });
            const zipURL = URL.createObjectURL(annotationZipBlob);
            setZipDownloadLink(zipURL);

            setVideoOutput(videoURL);
            setIsProcessingVideo(false);
        } catch (error) {
            console.error('Error detecting video:', error);
            alert('Error processing video');
            setIsProcessingVideo(false);
        }
    };

    return (
        <div className="app">
            <h1>Object Detection</h1>

            <div className="tabs">
                <button className={`tab ${selectedTab === 'image' ? 'active' : ''}`} onClick={() => setSelectedTab('image')}>
                    Image
                </button>
                <button className={`tab ${selectedTab === 'video' ? 'active' : ''}`} onClick={() => setSelectedTab('video')}>
                    Video
                </button>
            </div>

            {selectedTab === 'image' && (
                <div className="upload-section">
                    <h2>Upload Image</h2>
                    <input type="file" onChange={handleImageChange} accept="image/*" />
                    {imageFile && <img className="uploaded-image" src={URL.createObjectURL(imageFile)} alt="Uploaded Image" />}

                    <div className="slider-group">
                        <label>Confidence: {confidence}</label>
                        <input type="range" min="0" max="1" step="0.05" value={confidence} onChange={handleConfidenceChange} />
                    </div>

                    <div className="checkbox-group">
                        <label>Select Classes:</label>
                        {allClasses.map((cls) => (
                            <label key={cls} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    value={cls}
                                    checked={selectedClasses.includes(cls)}
                                    onChange={handleClassChange}
                                />
                                {cls}
                            </label>
                        ))}
                    </div>

                    <div className="radio-group">
                        <label>Model:</label>
                        <label>
                            <input
                                type="radio"
                                value="small"
                                checked={modelSelector === 'small'}
                                onChange={handleModelChange}
                            />
                            Small
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="base"
                                checked={modelSelector === 'base'}
                                onChange={handleModelChange}
                            />
                            Base
                        </label>
                    </div>

                    <button onClick={handleImageDetect}>Detect Image</button>

                    {imageOutput && (
                        <div className="result-section">
                            <h3>Detected Image:</h3>
                            <img className="detected-image" src={imageOutput} alt="Detected Image" />
                        </div>
                    )}
                </div>
            )}

            {selectedTab === 'video' && (
                <div className="upload-section">
                    <h2>Upload Video</h2>
                    <input type="file" onChange={handleVideoChange} accept="video/*" />
                    {videoFile && (
                        <div>
                            <h3>Uploaded Video</h3>
                            <video className="uploaded-video" controls src={URL.createObjectURL(videoFile)} />
                        </div>
                    )}

                    <div className="fps-group">
                        <label>FPS: {fps}</label>
                        <input type="number" min="5" max="60" value={fps} onChange={handleFpsChange} />
                    </div>

                    <div className="checkbox-group">
                        <label>Select Classes:</label>
                        {allClasses.map((cls) => (
                            <label key={cls} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    value={cls}
                                    checked={selectedClasses.includes(cls)}
                                    onChange={handleClassChange}
                                />
                                {cls}
                            </label>
                        ))}
                    </div>

                    <div className="radio-group">
                        <label>Model:</label>
                        <label>
                            <input
                                type="radio"
                                value="small"
                                checked={modelSelector === 'small'}
                                onChange={handleModelChange}
                            />
                            Small
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="base"
                                checked={modelSelector === 'base'}
                                onChange={handleModelChange}
                            />
                            Base
                        </label>
                    </div>

                    <button onClick={handleVideoDetect} disabled={isProcessingVideo}>
                        Detect Video
                    </button>

                    {isProcessingVideo && <div className="loading-spinner">Processing video... Please wait.</div>}

                    {videoOutput && (
                        <div className="result-section">
                            <h3>Detected Video:</h3>
                            <video className="detected-video" controls src={videoOutput} />
                            <a href={videoDownloadLink} download="output_video.mp4">Download Video</a>
                        </div>
                    )}

                    {zipDownloadLink && (
                        <div className="result-section">
                            <h3>Annotations:</h3>
                            <a href={zipDownloadLink} download="annotations.zip">Download Annotations</a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;

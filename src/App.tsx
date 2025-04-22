import React, { useState } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import './App.css';

const App: React.FC = () => {
    const allClasses = [
        'Turn Around',
        'Left',
        'Left Right',
        'Right',
        'Slight Left',
        'Slight Right',
        'Straight Left Right',
        'Straight',
        'Straight Left',
        'Straight Right'
    ];

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [imageOutput, setImageOutput] = useState<string | null>(null);
    const [videoOutput, setVideoOutput] = useState<string | null>(null);
    const [videoDownloadLink, setVideoDownloadLink] = useState<string | undefined>(undefined); // For video download
    const [zipDownloadLink, setZipDownloadLink] = useState<string | null>(null); // For zip download
    const [confidence, setConfidence] = useState<number>(0.9);
    const [fps, setFps] = useState<number>(15);
    const [modelSelector, setModelSelector] = useState<string>('small');
    const [selectedClasses, setSelectedClasses] = useState<string[]>(allClasses);
    const [selectedTab, setSelectedTab] = useState<'image' | 'video'>('image');
    const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false); // For video processing state

    // Handle image file selection
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
        }
    };

    // Handle video file selection
    const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setVideoFile(file);
        }
    };

    // Handle confidence slider change
    const handleConfidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setConfidence(parseFloat(event.target.value));
    };

    // Handle FPS change
    const handleFpsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFps(parseInt(event.target.value));
    };

    // Handle class selection change
    const handleClassChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSelectedClasses((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
        );
    };

    // Handle model selector change
    const handleModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setModelSelector(event.target.value);
    };

    // Image detection handler
    const handleImageDetect = async () => {
        if (!imageFile) {
            alert('Please upload an image file');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('confidence_model', confidence.toString());
        formData.append('model_selector', modelSelector);

        // Append each class individually to form data
        selectedClasses.forEach((cls) => {
            formData.append('clase_interes', cls); // Sending each class as a separate entry
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

    // Video detection handler
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

        // Append each class individually to form data
        selectedClasses.forEach((cls) => {
            formData.append('clase_interes', cls); // Sending each class as a separate entry
        });

        setIsProcessingVideo(true); // Start loading state

        try {
            const response = await axios.post('https://8001-01jpcsmf3nnqwv3x61p99v1nh7.cloudspaces.litng.ai/detect/video/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });


            // Assuming backend returns both video and zip file in the response as separate files (you might need to adapt this)
            // const videoURL = URL.createObjectURL(response.data);
            // setVideoOutput(videoURL);

            // Simulating backend response (adjust this based on actual backend response structure)
            // setVideoDownloadLink(videoURL); // You can set it as the downloadable link for the video.

            // Assuming you get a zip file containing the annotations
            // const zipURL = URL.createObjectURL(response.data);
            // setZipDownloadLink(zipURL); // You can set it as the downloadable link for the zip file.
            const zip = await JSZip.loadAsync(response.data);

            // 2. Extract the video file from the zip
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
            // const videoBlob = await videoEntry.async('blob');

            // 3. Create a URL for the video and set it
            // const videoURL = URL.createObjectURL(videoBlob);
            setVideoDownloadLink(videoURL);  // download link for the extracted video

            // 4. Also keep the full zip for download
            const annotationZipBlob = new Blob([response.data], { type: 'application/zip' });
            const zipURL = URL.createObjectURL(annotationZipBlob);
            setZipDownloadLink(zipURL);

            // 5. Done processing
            setVideoOutput(videoURL);
            setIsProcessingVideo(false);
        } catch (error) {
            console.error('Error detecting video:', error);
            alert('Error processing video');
            setIsProcessingVideo(false); // Stop loading state on error
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
                    <label>Confidence: {confidence}</label>
                    <input type="range" min="0" max="1" step="0.05" value={confidence} onChange={handleConfidenceChange} />
                    <div>
                        <label>Select Classes:</label>
                        {allClasses.map((cls) => (
                            <label key={cls}>
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
                    <div>
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

                    <div className="result-section">
                        {imageOutput && <h3>Detected Image:</h3>}
                        {imageOutput && <img className="detected-image" src={imageOutput} alt="Detected Image" />}
                    </div>
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
                    <label>FPS: {fps}</label>
                    <input type="number" min="5" max="60" value={fps} onChange={handleFpsChange} />
                    <div>
                        <label>Select Classes:</label>
                        {allClasses.map((cls) => (
                            <label key={cls}>
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
                    <div>
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
                    <button onClick={handleVideoDetect}>Detect Video</button>

                    <div className="result-section">
                        {isProcessingVideo && <div className="loading-spinner">Processing video... Please wait.</div>}
                        {videoOutput && (
                            <>
                                <h3>Detected Video:</h3>
                                <video className="detected-video" controls src={videoOutput} />
                                <a href={videoDownloadLink} download="output_video.mp4">Download Video</a>
                            </>
                        )}
                        {zipDownloadLink && (
                            <div>
                                <h3>Annotations:</h3>
                                <a href={zipDownloadLink} download="annotations.zip">Download Annotations</a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

import React, { useState } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { Button, Checkbox, FormControlLabel, FormGroup, Accordion, AccordionDetails, AccordionSummary, Grid, Slider, Typography, Box, CircularProgress, Tab, Tabs, Radio, RadioGroup, FormControl, FormLabel, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
    const [isProcessing, setIsProcessing] = useState<boolean>(false); // for loading state

    // Handlers for file change
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

    // Handlers for sliders
    const handleConfidenceChange = (event: Event, newValue: number | number[]) => {
        setConfidence(newValue as number);
    };

    const handleFpsChange = (event: Event, newValue: number | number[]) => {
        setFps(newValue as number);
    };

    // Handlers for selections
    const handleClassChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSelectedClasses((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
        );
    };

    const handleModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setModelSelector(event.target.value);
    };

    // Image detection logic
    const handleImageDetect = async () => {
        if (!imageFile) {
            alert('Please upload an image file');
            return;
        }

        setIsProcessing(true); // Start loading state

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('confidence_model', confidence.toString());
        formData.append('model_selector', modelSelector);

        selectedClasses.forEach((cls) => {
            formData.append('clase_interes', cls);
        });

        try {
            const response = await axios.post('https://8001-01jpcsmf3nnqwv3x61p99v1nh7.cloudspaces.litng.ai/detect/image/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'arraybuffer', // Expecting a binary response (zip file)
            });

            // Create a blob from the received data (which is a zip file)
            const zipData = new Blob([response.data], { type: 'application/zip' });

            // Load the zip file using JSZip
            const zip = await JSZip.loadAsync(zipData);

            // Extract the image from the zip (assuming the image is named 'output_image.png')
            const imageFile = zip.file('output_image.png');
            if (!imageFile) {
                throw new Error('output_image.png not found in the zip');
            }

            // Convert the image file to a Blob and then to a URL for display
            const imageBlob = await imageFile.async('blob');
            const imageURL = URL.createObjectURL(imageBlob);
            setImageOutput(imageURL);

            // If the backend also returns a zip with annotations, create a download link for the annotations
            const annotationZipBlob = new Blob([response.data], { type: 'application/zip' });
            const zipURL = URL.createObjectURL(annotationZipBlob);
            setZipDownloadLink(zipURL);

            setIsProcessing(false); // End loading state
        } catch (error) {
            console.error('Error detecting image:', error);
            alert('Error processing image');
            setIsProcessing(false); // End loading state
        }
    };

    // Video detection logic
    const handleVideoDetect = async () => {
        if (!videoFile) {
            alert('Please upload a video file');
            return;
        }

        setIsProcessing(true); // Start loading state

        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('confidence_model', confidence.toString());
        formData.append('fps', fps.toString());
        formData.append('model_selector', modelSelector);

        selectedClasses.forEach((cls) => {
            formData.append('clase_interes', cls);
        });

        try {
            const response = await axios.post('https://8001-01jpcsmf3nnqwv3x61p99v1nh7.cloudspaces.litng.ai/detect/video/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });

            const zip = await JSZip.loadAsync(response.data);
            const videoEntry = zip.file('output_video.mp4');
            if (!videoEntry) {
                console.error('output_video.mp4 not found inside zip');
                alert('Processed video missing in response');
                setIsProcessing(false); // End loading state
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
            setIsProcessing(false); // End loading state
        } catch (error) {
            console.error('Error detecting video:', error);
            alert('Error processing video');
            setIsProcessing(false); // End loading state
        }
    };

    return (
        <div className="app">
            <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 700 }}>
                Arrow Former
            </Typography>

            <Box display="flex" justifyContent="center" mb={3}>
                <Tabs value={selectedTab} onChange={(e, newTab) => setSelectedTab(newTab)} centered>
                    <Tab label="Image" value="image" />
                    <Tab label="Video" value="video" />
                </Tabs>
            </Box>

            {/* Image Tab */}
            {selectedTab === 'image' && (
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6" mb={2} sx={{ fontWeight: 600 }}>
                        Upload Image
                    </Typography>
                    <input type="file" onChange={handleImageChange} accept="image/*" />
                    {imageFile && <img src={URL.createObjectURL(imageFile)} alt="Uploaded Image" style={{ width: '100%', marginTop: '20px' }} />}

                    <FormControl fullWidth sx={{ marginTop: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            Confidence: {confidence}
                        </Typography>
                        <Slider value={confidence} onChange={handleConfidenceChange} step={0.05} min={0} max={1} />
                    </FormControl>

                    <Accordion sx={{ marginTop: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                Select Classes
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <FormGroup sx={{ marginTop: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    Select Classes:
                                </Typography>
                                {allClasses.map((cls) => (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedClasses.includes(cls)}
                                                onChange={handleClassChange}
                                                value={cls}
                                            />
                                        }
                                        label={cls}
                                        key={cls}
                                    />
                                ))}
                            </FormGroup>
                        </AccordionDetails>
                    </Accordion>
                    <FormControl sx={{ marginTop: 2 }}>
                        <FormLabel sx={{ fontWeight: 500 }}>Model:</FormLabel>
                        <RadioGroup row value={modelSelector} onChange={handleModelChange}>
                            <FormControlLabel value="small" control={<Radio />} label="Small" />
                            <FormControlLabel value="base" control={<Radio />} label="Base" />
                        </RadioGroup>
                    </FormControl>

                    <Button variant="contained" color="primary" onClick={handleImageDetect} fullWidth sx={{ marginTop: 2 }}>
                        Detect Image
                    </Button>

                    {isProcessing && (
                        <Box display="flex" justifyContent="center" mt={2}>
                            <CircularProgress />
                        </Box>
                    )}

                    {imageOutput && (
                        <Box mt={3}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Detected Image:</Typography>
                            <img src={imageOutput} alt="Detected Image" style={{ width: '100%' }} />
                        </Box>
                    )}

                    {zipDownloadLink && (
                        <Box mt={2}>
                            <a href={zipDownloadLink} download="output_files.zip">
                                <Button variant="outlined">Download ZIP</Button>
                            </a>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Video Tab */}
            {selectedTab === 'video' && (
                <Paper elevation={3} sx={{ padding: 3}}>
                <div className="upload-section">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Upload Video</Typography>
                    <input type="file" onChange={handleVideoChange} accept="video/*" />
                    {videoFile && (
                        <div>
                            <Typography variant="body1" sx={{ fontWeight: 500, marginTop: 2 }}>Uploaded Video:</Typography>
                            <video className="uploaded-video" controls src={URL.createObjectURL(videoFile)} style={{ width: '100%' }} />
                        </div>
                    )}

                    <FormControl fullWidth sx={{ marginTop: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            FPS: {fps}
                        </Typography>
                        <Slider value={fps} onChange={handleFpsChange} step={1} min={5} max={60} />
                    </FormControl>

                    <FormControl fullWidth sx={{ marginTop: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            Confidence: {confidence}
                        </Typography>
                        <Slider value={confidence} onChange={handleConfidenceChange} step={0.05} min={0} max={1} />
                    </FormControl>

                    <Accordion sx={{ marginTop: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                Select Classes
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <FormGroup sx={{ marginTop: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    Select Classes:
                                </Typography>
                                {allClasses.map((cls) => (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedClasses.includes(cls)}
                                                onChange={handleClassChange}
                                                value={cls}
                                            />
                                        }
                                        label={cls}
                                        key={cls}
                                    />
                                ))}
                            </FormGroup>
                        </AccordionDetails>
                    </Accordion>

                    <FormControl sx={{ marginTop: 2 }}>
                        <FormLabel sx={{ fontWeight: 500 }}>Model:</FormLabel>
                        <RadioGroup row value={modelSelector} onChange={handleModelChange}>
                            <FormControlLabel value="small" control={<Radio />} label="Small" />
                            <FormControlLabel value="base" control={<Radio />} label="Base" />
                        </RadioGroup>
                    </FormControl>

                    <Button variant="contained" color="primary" onClick={handleVideoDetect} fullWidth sx={{ marginTop: 2 }}>
                        Detect Video
                    </Button>

                    {isProcessing && (
                        <Box display="flex" justifyContent="center" mt={2}>
                            <CircularProgress />
                        </Box>
                    )}

                    <div className="result-section">
                        {videoOutput && (
                            <>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Detected Video:</Typography>
                                <video className="detected-video" controls src={videoOutput} style={{ width: '100%' }} />
                                {videoDownloadLink && (
                                    <Box mt={2}>
                                        <Button variant="outlined" href={videoDownloadLink} download="output_video.mp4">
                                            Download Video
                                        </Button>
                                    </Box>
                                )}
                            </>
                        )}

                        {zipDownloadLink && (
                            <Box mt={2}>
                                <a href={zipDownloadLink} download="annotations.zip">
                                    <Button variant="outlined">Download Annotations</Button>
                                </a>
                            </Box>
                        )}
                    </div>
                </div>
                </Paper>
            )}
        </div>
    );
};

export default App;

import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Scissors } from "lucide-react";

// Reference image path - place your labeled reference image here
const REFERENCE_IMAGE_PATH = "/assets/reference-template.png";

export default function TestFormWithCropper() {
  const [currentView, setCurrentView] = useState("form"); // 'form' or 'cropper'
  const [formData, setFormData] = useState({
    testName: "",
    ticketCode: "",
    documentTitle: "",
    projectName: "",
    color: "#3b82f6",
    testLocation: "",
    sampleQty: "",
    testStartDate: "",
    testCompletionDate: "",
    sampleConfig: "",
    testCondition: "",
    status: "Pending"
  });

  // Cropper state
  const [targetImage, setTargetImage] = useState(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  const [regions, setRegions] = useState([]);
  const [croppedImages, setCroppedImages] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [imageQuality, setImageQuality] = useState(1.0);
  const [imageFormat, setImageFormat] = useState("png");
  const [processing, setProcessing] = useState(false);
  const outputCanvasRef = useRef(null);

  // Load OpenCV
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = () => {
      window.cv["onRuntimeInitialized"] = () => {
        console.log("OpenCV.js loaded");
        setCvLoaded(true);
        // Auto-process reference image
        loadReferenceImage();
      };
    };
    document.body.appendChild(script);
  }, []);

  // Auto-load and process reference image
  const loadReferenceImage = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = window.cv;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const src = cv.matFromImageData(imgData);
        
        const hsv = new cv.Mat();
        cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

        const lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [20, 100, 100, 0]);
        const upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [40, 255, 255, 255]);
        const mask = new cv.Mat();
        cv.inRange(hsv, lower, upper, mask);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let boxes = [];
        const minArea = 100;
        
        for (let i = 0; i < contours.size(); ++i) {
          const rect = cv.boundingRect(contours.get(i));
          const area = rect.width * rect.height;
          
          if (area >= minArea) {
            boxes.push(rect);
          }
        }

        setRegions(boxes);
        console.log(`✅ Auto-loaded ${boxes.length} regions from reference template`);

        src.delete(); hsv.delete(); mask.delete(); lower.delete(); upper.delete();
        contours.delete(); hierarchy.delete();
      } catch (err) {
        console.error("Error processing reference image:", err);
      }
    };
    img.onerror = () => {
      console.warn("Could not load reference image from:", REFERENCE_IMAGE_PATH);
    };
    img.src = REFERENCE_IMAGE_PATH;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Save form data
  const handleSaveTest = () => {
    if (!formData.testName || !formData.projectName) {
      alert("Please fill in Test Name and Project Name");
      return;
    }

    const newRecord = {
      ...formData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    const existingRecords = JSON.parse(localStorage.getItem("testRecords") || "[]");
    const updatedRecords = [...existingRecords, newRecord];
    localStorage.setItem("testRecords", JSON.stringify(updatedRecords));

    alert("Test record saved successfully!");
    
    // Reset form
    setFormData({
      testName: "",
      ticketCode: "",
      documentTitle: "",
      projectName: "",
      color: "#3b82f6",
      testLocation: "",
      sampleQty: "",
      testStartDate: "",
      testCompletionDate: "",
      sampleConfig: "",
      testCondition: "",
      status: "Pending"
    });
  };

  // Crop target image
  const cropTargetImage = () => {
    if (!regions.length) {
      alert("Reference template not loaded. Please check the reference image path.");
      return;
    }
    
    setProcessing(true);
    const cv = window.cv;
    const imgElement = document.getElementById("targetImage");
    
    try {
      const src = cv.imread(imgElement);
      const imgWidth = src.cols;
      const imgHeight = src.rows;

      const newCroppedImages = [];
      
      regions.forEach((rect, i) => {
        try {
          const x = Math.max(0, Math.min(rect.x, imgWidth - 1));
          const y = Math.max(0, Math.min(rect.y, imgHeight - 1));
          const width = Math.min(rect.width, imgWidth - x);
          const height = Math.min(rect.height, imgHeight - y);
          
          if (width <= 0 || height <= 0) return;
          
          const validRect = new cv.Rect(x, y, width, height);
          const roi = src.roi(validRect);
          
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d", {
            alpha: true,
            desynchronized: false,
            willReadFrequently: false
          });
          
          ctx.imageSmoothingEnabled = false;
          cv.imshow(canvas, roi);
          
          if (imageQuality === 1.0 && imageFormat === "png") {
            try {
              const tempMat = cv.imread(canvas);
              const kernel = cv.matFromArray(3, 3, cv.CV_32F, [
                0, -1, 0, -1, 5, -1, 0, -1, 0
              ]);
              cv.filter2D(tempMat, tempMat, cv.CV_8U, kernel);
              cv.imshow(canvas, tempMat);
              tempMat.delete();
              kernel.delete();
            } catch (err) {
              console.warn("Sharpening failed:", err);
            }
          }
          
          const mimeType = imageFormat === "png" ? "image/png" : "image/jpeg";
          const croppedData = canvas.toDataURL(mimeType, imageQuality);
          
          newCroppedImages.push({
            id: i,
            data: croppedData,
            name: `${formData.testName || 'crop'}_${i + 1}.${imageFormat}`,
            width: width,
            height: height
          });
          
          roi.delete();
        } catch (err) {
          console.error(`Error cropping region ${i}:`, err);
        }
      });

      if (newCroppedImages.length === 0) {
        alert("No valid crops generated. Please check image dimensions.");
      } else {
        setCroppedImages(newCroppedImages);
        setShowPreview(true);
      }
      
      src.delete();
    } catch (err) {
      console.error("Error in cropTargetImage:", err);
      alert("Failed to process image.");
    } finally {
      setProcessing(false);
    }
  };

  // Download individual image
  const downloadCroppedImage = (img) => {
    const link = document.createElement("a");
    link.href = img.data;
    link.download = img.name;
    link.click();
  };

  // Download all as ZIP
  const downloadAllImages = async () => {
    if (!croppedImages.length) return;
    
    const downloadIndividually = () => {
      croppedImages.forEach((img, index) => {
        setTimeout(() => downloadCroppedImage(img), index * 300);
      });
    };

    try {
      if (!window.JSZip) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => downloadAllImages();
        document.head.appendChild(script);
        return;
      }

      const zip = new window.JSZip();
      const blobPromises = croppedImages.map(img => 
        fetch(img.data).then(res => res.blob())
      );
      const blobs = await Promise.all(blobPromises);
      blobs.forEach((blob, index) => {
        zip.file(croppedImages[index].name, blob);
      });
      
      const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${formData.testName || 'cropped'}_images.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error creating zip:", error);
      downloadIndividually();
    }
  };

  // Form View
  if (currentView === "form") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Create New Test Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Test Name *</label>
                  <input
                    type="text"
                    name="testName"
                    value={formData.testName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Heat Soak Test"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Document Number</label>
                  <input
                    type="text"
                    name="ticketCode"
                    value={formData.ticketCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., DOC-2025-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Document Title</label>
                  <input
                    type="text"
                    name="documentTitle"
                    value={formData.documentTitle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Project Name *</label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Module Testing Phase 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Color Tag</label>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Test Location</label>
                  <input
                    type="text"
                    name="testLocation"
                    value={formData.testLocation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Lab A, Room 301"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sample Quantity</label>
                  <input
                    type="text"
                    name="sampleQty"
                    value={formData.sampleQty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 10 units"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Test Start Date</label>
                  <input
                    type="date"
                    name="testStartDate"
                    value={formData.testStartDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Test Completion Date</label>
                  <input
                    type="date"
                    name="testCompletionDate"
                    value={formData.testCompletionDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sample Configuration</label>
                  <input
                    type="text"
                    name="sampleConfig"
                    value={formData.sampleConfig}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Test Condition</label>
                  <input
                    type="text"
                    name="testCondition"
                    value={formData.testCondition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 85°C, 85% RH"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveTest}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Test Record
                </button>
                <button
                  onClick={() => setCurrentView("cropper")}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                >
                  <Scissors size={20} />
                  Crop Test Images
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Cropper View
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => setCurrentView("form")}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={20} />
          Back to Form
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Image Cropper (Template-Based)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">⚙️ Quality Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Output Format:</label>
                  <select 
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPEG (Compressed)</option>
                  </select>
                </div>
                
                {imageFormat === "jpeg" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      JPEG Quality: {Math.round(imageQuality * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={imageQuality}
                      onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-700 mb-2">
                ✓ Reference template loaded: <strong>{regions.length} regions</strong> detected
              </p>
              <p className="text-xs text-gray-600">
                Template path: <code className="bg-white px-2 py-1 rounded">{REFERENCE_IMAGE_PATH}</code>
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="font-medium mb-3">📤 Upload Your Test Image:</p>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  setTargetImage(URL.createObjectURL(e.target.files[0]));
                  setCroppedImages([]);
                  setShowPreview(false);
                }}
                className="mb-3"
              />
              {targetImage && (
                <img 
                  id="targetImage" 
                  src={targetImage} 
                  alt="target" 
                  className="my-3 max-w-full border rounded shadow-sm"
                  style={{ maxHeight: '400px', width: 'auto' }}
                />
              )}
              <button
                onClick={cropTargetImage}
                disabled={!cvLoaded || !regions.length || !targetImage || processing}
                className="px-6 py-2 bg-green-600 text-white rounded disabled:bg-gray-400 hover:bg-green-700 transition"
              >
                {processing ? "Processing..." : "Crop Using Template"}
              </button>
            </div>

            <canvas ref={outputCanvasRef} className="hidden" />

            {showPreview && croppedImages.length > 0 && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
                  <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold">
                      Preview ({croppedImages.length} images)
                    </h3>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                      {croppedImages.map((img) => (
                        <div key={img.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="text-xs font-medium mb-2 text-center">
                            {img.name}
                            <br />
                            <span className="text-gray-500">({img.width}×{img.height}px)</span>
                          </div>
                          <img 
                            src={img.data} 
                            alt={`Crop ${img.id + 1}`}
                            className="w-full border rounded bg-white"
                          />
                          <button
                            onClick={() => downloadCroppedImage(img)}
                            className="w-full mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 justify-center sticky bottom-0 bg-white pt-4 border-t">
                      <button
                        onClick={downloadAllImages}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                      >
                        📦 Download All as ZIP
                      </button>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {croppedImages.length > 0 && !showPreview && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowPreview(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  👁️ View Cropped Images ({croppedImages.length})
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
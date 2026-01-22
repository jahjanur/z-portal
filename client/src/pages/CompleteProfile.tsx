import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import API from "../api";

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
};

interface UserData {
  id: number;
  email: string;
  name: string;
  company: string;
  logo?: string;
  address?: string;
  postalAddress?: string;
  phoneNumber?: string;
  extraEmails?: string;
  brandPattern?: string;
  shortInfo?: string;
  inviteExpires?: string;
}

interface FormData {
  address: string;
  postalAddress: string;
  phoneNumber: string;
  extraEmails: string;
  brandPattern: string;
  shortInfo: string;
}

interface UploadedFileInfo {
  file: File;
  preview: string | null;
}

const CompleteProfile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [existingFile, setExistingFile] = useState<string | null>(null);

  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState<number | null>(null);
  const [tempColor, setTempColor] = useState<string>("#5B4FFF");

  const [formData, setFormData] = useState<FormData>({
    address: "",
    postalAddress: "",
    phoneNumber: "",
    extraEmails: "",
    brandPattern: "",
    shortInfo: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await API.get<UserData>(`/users/by-token/${token}`);
        setUserData(response.data);
        
        setFormData({
          address: response.data.address || "",
          postalAddress: response.data.postalAddress || "",
          phoneNumber: response.data.phoneNumber || "",
          extraEmails: response.data.extraEmails || "",
          brandPattern: response.data.brandPattern || "",
          shortInfo: response.data.shortInfo || "",
        });

        if (response.data.logo) {
          setExistingFile(response.data.logo);
        }

        if (response.data.brandPattern) {
          const hexColors = response.data.brandPattern.match(/#[0-9A-Fa-f]{6}/g);
          if (hexColors && hexColors.length > 0) {
            setBrandColors(hexColors);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching user data:", err);
        const errorMessage = err instanceof Error && 'response' in err 
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Invalid or expired invite link"
          : "Invalid or expired invite link";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [token]);

  const handleAddColor = () => {
    const newIndex = brandColors.length;
    setBrandColors([...brandColors, "#5B4FFF"]);
    setShowColorPicker(newIndex);
    setTempColor("#5B4FFF");
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...brandColors];
    newColors[index] = color;
    setBrandColors(newColors);
  };

  const handleRemoveColor = (index: number) => {
    setBrandColors(brandColors.filter((_, i) => i !== index));
    if (showColorPicker === index) {
      setShowColorPicker(null);
    }
  };

  const handleOpenColorPicker = (index: number) => {
    setTempColor(brandColors[index]);
    setShowColorPicker(index);
  };

  const handleCloseColorPicker = () => {
    setShowColorPicker(null);
  };

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFiles(prev => {
          const newFiles = [...prev, { file, preview: reader.result as string }];
          if (selectedLogoIndex === null && file.type.startsWith('image/')) {
            setSelectedLogoIndex(newFiles.length - 1);
          }
          return newFiles;
        });
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedFiles(prev => [...prev, { file, preview: null }]);
    }
  });

  e.target.value = '';
};

const handleRemoveFile = (index: number) => {
  setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  
  if (selectedLogoIndex === index) {
    setSelectedLogoIndex(null);
  } else if (selectedLogoIndex !== null && selectedLogoIndex > index) {
    setSelectedLogoIndex(selectedLogoIndex - 1);
  }
};

  const handleRemoveExistingFile = () => {
    setExistingFile(null);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (['pdf'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.brandPattern.trim() && brandColors.length === 0) {
    setError("Please provide brand colors either by entering text or using color pickers");
    return;
  }

  setSubmitting(true);
  setError(null);

  try {
    let finalBrandPattern = formData.brandPattern;
    if (brandColors.length > 0) {
      const colorsString = brandColors.join(", ");
      finalBrandPattern = finalBrandPattern 
        ? `${finalBrandPattern}, ${colorsString}` 
        : colorsString;
    }

    const submitData = new FormData();
    submitData.append("token", token!);
    submitData.append("address", formData.address);
    submitData.append("postalAddress", formData.postalAddress);
    submitData.append("phoneNumber", formData.phoneNumber);
    submitData.append("extraEmails", formData.extraEmails);
    submitData.append("brandPattern", finalBrandPattern);
    submitData.append("shortInfo", formData.shortInfo);

    if (selectedLogoIndex !== null) {
      submitData.append("logoIndex", selectedLogoIndex.toString());
    }

    uploadedFiles.forEach((fileInfo) => {
      submitData.append("files", fileInfo.file);
    });

    await API.post("/users/complete-profile", submitData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert("Profile completed successfully! You can now log in.");
    navigate("/");
  } catch (err) {
    console.error("Error completing profile:", err);
    const errorMessage = err instanceof Error && 'response' in err 
      ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to complete profile"
      : "Failed to complete profile";
    setError(errorMessage);
  } finally {
    setSubmitting(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ backgroundColor: colors.secondary, animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ backgroundColor: colors.accent, animationDelay: "0.2s" }}
            ></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-md p-8 bg-white border border-red-200 shadow-xl rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-center text-gray-900">Invalid Link</h2>
          <p className="mb-6 text-center text-gray-600">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full px-4 py-3 font-semibold text-white transition-colors rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-3xl px-4 mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block p-4 mb-4 bg-white rounded-full shadow-lg">
            <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Welcome, <span style={{ color: colors.primary }}>{userData?.name}!</span>
          </h1>
          <p className="text-lg text-gray-600">Complete your company profile to get started</p>
          <p className="mt-2 text-sm font-medium text-gray-500">{userData?.company}</p>
        </div>

        {/* Form */}
        <div className="p-8 bg-white border border-gray-200 shadow-xl rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            {/* Multiple Files Upload */}
            <div className="p-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50">
              <label className="block mb-3 text-sm font-semibold text-gray-700">
                Attach Files (Optional)
              </label>
              <p className="mb-4 text-xs text-gray-500">
                Upload multiple documents (logos, contracts, business licenses, etc.)
              </p>
              
              {/* Upload Button */}
              <label className="flex flex-col items-center justify-center h-32 mb-4 transition-colors border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-100">
                <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-1 text-sm font-medium text-gray-600">
                  Click to upload files
                </p>
                <p className="text-xs text-gray-500">Any file type • Multiple files allowed</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Existing File */}
              {existingFile && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-gray-600">Existing File:</p>
                  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(existingFile)}
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {existingFile.split('/').pop()}
                        </p>
                        <a
                          href={`http://localhost:4001${existingFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline"
                          style={{ color: colors.primary }}
                        >
                          View file
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveExistingFile}
                      className="p-1 text-red-600 transition-colors rounded hover:bg-red-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Uploaded Files List */}
{/* Uploaded Files List */}
{uploadedFiles.length > 0 && (
  <div className="space-y-2">
    <p className="text-xs font-semibold text-gray-600">
      {uploadedFiles.length} file(s) ready to upload:
    </p>
    {uploadedFiles.map((fileInfo, index) => {
      const isImage = fileInfo.file.type.startsWith('image/');
      const isLogo = selectedLogoIndex === index;
      
      return (
        <div 
          key={index} 
          className={`flex items-center justify-between p-3 border-2 rounded-lg transition-all ${
            isLogo 
              ? 'bg-purple-50 border-purple-300' 
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center flex-1 min-w-0 gap-3">
            {fileInfo.preview ? (
              <div className="relative">
                <img
                  src={fileInfo.preview}
                  alt={fileInfo.file.name}
                  className={`object-cover w-12 h-12 rounded border-2 ${
                    isLogo ? 'border-purple-500' : 'border-gray-200'
                  }`}
                />
                {isLogo && (
                  <div className="absolute p-1 bg-purple-600 rounded-full -top-2 -right-2">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {getFileIcon(fileInfo.file.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {fileInfo.file.name}
                </p>
                {isLogo && (
                  <span className="px-2 py-0.5 text-xs font-bold text-purple-700 bg-purple-200 rounded-full">
                    LOGO
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {/* Set as Logo Button - Only for images */}
            {isImage && !isLogo && (
              <button
                type="button"
                onClick={() => setSelectedLogoIndex(index)}
                className="px-3 py-1 text-xs font-semibold text-purple-700 transition-colors bg-purple-100 rounded-lg hover:bg-purple-200"
                title="Set as logo"
              >
                Set as Logo
              </button>
            )}
            {isImage && isLogo && (
              <button
                type="button"
                onClick={() => setSelectedLogoIndex(null)}
                className="px-3 py-1 text-xs font-semibold text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                title="Unset logo"
              >
                Unset Logo
              </button>
            )}
            {/* Remove Button */}
            <button
              type="button"
              onClick={() => handleRemoveFile(index)}
              className="p-1 text-red-600 transition-colors rounded hover:bg-red-50"
              title="Remove file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      );
    })}
    
    {/* Logo Selection Info */}
    {uploadedFiles.some(f => f.file.type.startsWith('image/')) && selectedLogoIndex === null && (
      <div className="p-3 mt-3 border rounded-lg border-amber-200 bg-amber-50">
        <p className="text-xs font-medium text-amber-800">
          💡 Tip: Click "Set as Logo" on an image to use it as your company logo
        </p>
      </div>
    )}
  </div>
)}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Physical Address *
                </label>
                <input
                  type="text"
                  placeholder="123 Business Street, City, Country"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                  required
                />
              </div>

              {/* Postal Address */}
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Postal Address *
                </label>
                <input
                  type="text"
                  placeholder="P.O. Box 123, City, Postal Code"
                  value={formData.postalAddress}
                  onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="+389 72 123 456"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                  required
                />
              </div>

              {/* Extra Emails */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Additional Email Addresses
                </label>
                <input
                  type="text"
                  placeholder="support@company.com, sales@company.com"
                  value={formData.extraEmails}
                  onChange={(e) => setFormData({ ...formData, extraEmails: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple emails with commas</p>
              </div>

              {/* Brand Pattern/Colors - Text Input */}
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Brand Colors/Patterns (Text)
                  {brandColors.length === 0 && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g., Royal Blue and Gold, or #FF6B6B, #4ECDC4"
                  value={formData.brandPattern}
                  onChange={(e) => setFormData({ ...formData, brandPattern: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Describe your brand colors or use the color pickers below
                </p>
              </div>

              {/* Brand Colors - Color Pickers */}
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Brand Colors (Color Picker)
                  {!formData.brandPattern.trim() && brandColors.length === 0 && <span className="text-red-500"> *</span>}
                </label>
                
                {brandColors.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {brandColors.map((color, index) => (
                      <div key={index} className="relative">
                        <div className="flex items-center gap-2 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300">
                          <button
                            type="button"
                            onClick={() => handleOpenColorPicker(index)}
                            className="relative w-16 h-16 overflow-hidden border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
                            style={{ backgroundColor: color }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 hover:opacity-100 bg-black/20">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          </button>
                          <div className="text-sm">
                            <div className="font-mono font-bold text-gray-800">{color.toUpperCase()}</div>
                            <div className="text-xs text-gray-500">Click to edit</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(index)}
                            className="p-1.5 ml-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Color Picker Popup */}
                        {showColorPicker === index && (
                          <>
                            {/* Backdrop */}
                            <div 
                              className="fixed inset-0 z-40 bg-black/30"
                              onClick={handleCloseColorPicker}
                            />
                            {/* Centered Popup */}
                            <div className="fixed z-50 p-6 transform -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-gray-300 shadow-2xl top-1/2 left-1/2 rounded-2xl" style={{ minWidth: '280px' }}>
                              <h3 className="mb-4 text-lg font-bold text-gray-900">Pick a Color</h3>
                              <div className="mb-4">
                                <HexColorPicker 
                                  color={tempColor} 
                                  onChange={(newColor) => {
                                    setTempColor(newColor);
                                    handleColorChange(index, newColor);
                                  }}
                                  style={{ width: '100%', height: '200px' }}
                                />
                              </div>
                              <div className="flex items-center gap-2 mb-4">
                                <div 
                                  className="w-12 h-12 border-2 border-gray-300 rounded-lg"
                                  style={{ backgroundColor: tempColor }}
                                />
                                <input
                                  type="text"
                                  value={tempColor}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setTempColor(value);
                                    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                      handleColorChange(index, value);
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 font-mono text-sm uppercase border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                                  placeholder="#000000"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleCloseColorPicker}
                                className="w-full px-4 py-3 text-sm font-semibold text-white transition-colors rounded-lg hover:opacity-90"
                                style={{ backgroundColor: colors.primary }}
                              >
                                Done
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddColor}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Color
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  {brandColors.length === 0 && !formData.brandPattern.trim() 
                    ? "Please add at least one color or enter text description above"
                    : `${brandColors.length} color${brandColors.length !== 1 ? 's' : ''} selected`
                  }
                </p>
              </div>

              {/* Short Info */}
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  About Your Company *
                </label>
                <textarea
                  placeholder="Tell us about your company, your mission, and what you do..."
                  value={formData.shortInfo}
                  onChange={(e) => setFormData({ ...formData, shortInfo: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 text-lg font-semibold text-white transition-all rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.primary }}
              >
                {submitting ? "Saving..." : "Complete Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your account manager
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
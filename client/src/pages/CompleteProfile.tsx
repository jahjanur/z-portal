import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HexColorPicker } from "react-colorful";
import API, { getFileUrl } from "../api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";

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
  const [tempColor, setTempColor] = useState<string>("#6b7280");

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
    setBrandColors([...brandColors, "#6b7280"]);
    setShowColorPicker(newIndex);
    setTempColor("#6b7280");
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
        <svg className="h-8 w-8 text-[var(--color-info-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (['pdf'].includes(ext || '')) {
      return (
        <svg className="h-8 w-8 text-[var(--color-destructive-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(ext || '')) {
      return (
        <svg className="h-8 w-8 text-[var(--color-info-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-8 w-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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

      toast.success("Profile completed successfully! You can now log in.");
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
      <div className="flex min-h-screen items-center justify-center bg-app p-6">
        <Spinner page size="lg" label="Loading your profile..." />
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-up">
          <EmptyState
            icon={
              <svg className="h-6 w-6 text-[var(--color-destructive-text)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
            title="Invalid Link"
            description={error}
            action={
              <Button variant="secondary" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-app py-10 sm:py-12">
      <div className="mx-auto min-w-0 max-w-3xl space-y-6 px-4 animate-fade-up">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-elev-sm">
            <svg className="h-8 w-8 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="page-title mb-2">
            Welcome, <span className="text-[var(--color-text-muted)]">{userData?.name}!</span>
          </h1>
          <p className="page-subtitle">Complete your company profile to get started</p>
          {userData?.company && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              {userData.company}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-4 animate-fade-in"
            >
              <svg className="h-5 w-5 shrink-0 text-[var(--color-destructive-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-destructive-text)]">{error}</p>
            </div>
          )}

          {/* Section: Documents & Logo */}
          <section className="card-panel p-5 sm:p-6">
            <h2 className="section-title mb-1">Documents &amp; Logo</h2>
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              Upload multiple documents (logos, contracts, business licenses, etc.) — optional
            </p>

            {/* Dropzone */}
            <label className="group flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-2)]">
              <svg className="mb-2 h-10 w-10 text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mb-1 text-sm font-semibold text-[var(--color-text-secondary)]">
                Click to upload files
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Any file type &middot; Multiple files allowed</p>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Existing File */}
            {existingFile && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Existing file</p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {getFileIcon(existingFile)}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {existingFile.split('/').pop()}
                      </p>
                      <a
                        href={getFileUrl(existingFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-text-secondary)] hover:underline"
                      >
                        View file
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveExistingFile}
                    aria-label="Remove existing file"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)]"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {uploadedFiles.length} file(s) ready to upload
                </p>
                {uploadedFiles.map((fileInfo, index) => {
                  const isImage = fileInfo.file.type.startsWith('image/');
                  const isLogo = selectedLogoIndex === index;

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-all ${
                        isLogo
                          ? "border-[var(--color-border-hover)] bg-[var(--color-surface-3)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {fileInfo.preview ? (
                          <div className="relative shrink-0">
                            <img
                              src={fileInfo.preview}
                              alt={fileInfo.file.name}
                              className={`h-12 w-12 rounded-lg border object-cover ${
                                isLogo ? "border-[var(--color-border-hover)]" : "border-[var(--color-border)]"
                              }`}
                            />
                            {isLogo && (
                              <div className="absolute -right-2 -top-2 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-1">
                                <svg className="h-3 w-3 text-[var(--color-success-text)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center justify-center">
                            {getFileIcon(fileInfo.file.name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                              {fileInfo.file.name}
                            </p>
                            {isLogo && (
                              <span className="badge badge-success shrink-0">LOGO</span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        {isImage && !isLogo && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedLogoIndex(index)}
                            title="Set as logo"
                          >
                            Set as Logo
                          </Button>
                        )}
                        {isImage && isLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLogoIndex(null)}
                            title="Unset logo"
                          >
                            Unset Logo
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          title="Remove file"
                          aria-label="Remove file"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)]"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Logo Selection Info */}
                {uploadedFiles.some(f => f.file.type.startsWith('image/')) && selectedLogoIndex === null && (
                  <div className="mt-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3">
                    <p className="text-xs font-medium text-[var(--color-warning-text)]">
                      Tip: Click "Set as Logo" on an image to use it as your company logo
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section: Contact Details */}
          <section className="card-panel p-5 sm:p-6">
            <h2 className="section-title mb-4">Contact Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Address */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  Physical Address <span className="text-[var(--color-destructive-text)]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="123 Business Street, City, Country"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-dark w-full px-4 py-3"
                  required
                />
              </div>

              {/* Postal Address */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  Postal Address <span className="text-[var(--color-destructive-text)]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="P.O. Box 123, City, Postal Code"
                  value={formData.postalAddress}
                  onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
                  className="input-dark w-full px-4 py-3"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  Phone Number <span className="text-[var(--color-destructive-text)]">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+389 72 123 456"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="input-dark w-full px-4 py-3"
                  required
                />
              </div>

              {/* Extra Emails */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  Additional Email Addresses
                </label>
                <input
                  type="text"
                  placeholder="support@company.com, sales@company.com"
                  value={formData.extraEmails}
                  onChange={(e) => setFormData({ ...formData, extraEmails: e.target.value })}
                  className="input-dark w-full px-4 py-3"
                />
                <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">Separate multiple emails with commas</p>
              </div>
            </div>
          </section>

          {/* Section: Brand Identity */}
          <section className="card-panel p-5 sm:p-6">
            <h2 className="section-title mb-4">Brand Identity</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Brand Pattern/Colors - Text Input */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  Brand Colors/Patterns (Text)
                  {brandColors.length === 0 && <span className="text-[var(--color-destructive-text)]"> *</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g., Royal Blue and Gold, or #FF6B6B, #4ECDC4"
                  value={formData.brandPattern}
                  onChange={(e) => setFormData({ ...formData, brandPattern: e.target.value })}
                  className="input-dark w-full px-4 py-3"
                />
                <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                  Describe your brand colors or use the color pickers below
                </p>
              </div>

              {/* Brand Colors - Color Pickers */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  Brand Colors (Color Picker)
                  {!formData.brandPattern.trim() && brandColors.length === 0 && (
                    <span className="text-[var(--color-destructive-text)]"> *</span>
                  )}
                </label>

                {brandColors.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-3">
                    {brandColors.map((color, index) => (
                      <div key={index} className="relative">
                        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 transition-colors hover:border-[var(--color-border-hover)]">
                          <button
                            type="button"
                            onClick={() => handleOpenColorPicker(index)}
                            aria-label={`Edit color ${color}`}
                            className="relative h-14 w-14 cursor-pointer overflow-hidden rounded-lg border border-[var(--color-border)] transition-colors hover:border-[var(--color-border-hover)]"
                            style={{ backgroundColor: color }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity hover:opacity-100">
                              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </span>
                          </button>
                          <div className="text-sm">
                            <div className="font-mono font-bold text-[var(--color-text-primary)]">{color.toUpperCase()}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">Tap to edit</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(index)}
                            aria-label="Remove color"
                            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)]"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Color Picker Popup */}
                        {showColorPicker === index && (
                          <>
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0 z-40 bg-[var(--color-overlay)] animate-fade-in"
                              onClick={handleCloseColorPicker}
                            />
                            {/* Centered Popup */}
                            <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[320px] -translate-x-1/2 -translate-y-1/2 transform rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-solid)] p-5 shadow-elev-lg animate-scale-in">
                              <h3 className="mb-4 text-base font-bold text-[var(--color-text-primary)]">Pick a Color</h3>
                              <div className="mb-4 w-full max-w-[280px] mx-auto sm:mx-0">
                                <HexColorPicker
                                  color={tempColor}
                                  onChange={(newColor) => {
                                    setTempColor(newColor);
                                    handleColorChange(index, newColor);
                                  }}
                                  style={{ width: '100%', height: '200px' }}
                                />
                              </div>
                              <div className="mb-4 flex items-center gap-3">
                                <div
                                  className="h-11 w-11 shrink-0 rounded-lg border border-[var(--color-border)]"
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
                                  className="input-dark min-w-0 flex-1 px-3 py-2.5 font-mono text-sm uppercase"
                                  placeholder="#000000"
                                />
                              </div>
                              <Button type="button" variant="primary" className="w-full" onClick={handleCloseColorPicker}>
                                Done
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button type="button" variant="secondary" onClick={handleAddColor} className="w-full sm:w-auto">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Color
                </Button>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {brandColors.length === 0 && !formData.brandPattern.trim()
                    ? "Please add at least one color or enter text description above"
                    : `${brandColors.length} color${brandColors.length !== 1 ? 's' : ''} selected`
                  }
                </p>
              </div>

              {/* Short Info */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                  About Your Company <span className="text-[var(--color-destructive-text)]">*</span>
                </label>
                <textarea
                  placeholder="Tell us about your company, your mission, and what you do..."
                  value={formData.shortInfo}
                  onChange={(e) => setFormData({ ...formData, shortInfo: e.target.value })}
                  rows={4}
                  className="input-dark w-full resize-none px-4 py-3"
                  required
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="pt-1 safe-bottom">
            <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
              {submitting ? "Saving..." : "Complete Profile"}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="pb-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Need help? Contact your account manager
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;

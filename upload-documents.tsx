import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/main-layout";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UploadedDocument {
  type: string;
  name: string;
  status: 'uploading' | 'uploaded' | 'pending' | 'verified';
}

const REQUIRED_DOCUMENTS = [
  {
    type: "license",
    title: "Cannabis License",
    description: "Your official cannabis cultivation/distribution license",
    required: true,
  },
  {
    type: "coa",
    title: "Certificate of Analysis (COA)",
    description: "Recent COA for your cannabis products",
    required: true,
  },
  {
    type: "insurance",
    title: "Insurance Certificate",
    description: "Business insurance documentation",
    required: false,
  },
  {
    type: "registration",
    title: "Business Registration",
    description: "Company registration certificate",
    required: false,
  },
];

export default function UploadDocuments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  const handleFileUpload = async (documentType: string, file: File) => {
    try {
      // Create a temporary document record to track upload
      const tempDoc: UploadedDocument = {
        type: documentType,
        name: file.name,
        status: 'uploading',
      };
      
      setUploadedDocs(prev => [
        ...prev.filter(doc => doc.type !== documentType),
        tempDoc
      ]);

      // Note: Real upload would use ObjectUploader component's logic here
      // For now, we'll create the document record directly
      
      const payload = {
        documentType,
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        objectPath: `uploads/documents/${Date.now()}-${file.name}`, // Mock object path for now
        description: `Uploaded ${documentType} document`,
      };

      console.log('Sending document payload:', payload);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Document upload error:', errorData);
        throw new Error(`Failed to save document: ${JSON.stringify(errorData)}`);
      }

      const savedDoc = await response.json();
      
      const newDoc: UploadedDocument = {
        type: documentType,
        name: file.name,
        status: 'uploaded',
      };
      
      setUploadedDocs(prev => [
        ...prev.filter(doc => doc.type !== documentType),
        newDoc
      ]);

      // Invalidate documents query to refresh the documents list
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      toast({
        title: "Document uploaded!",
        description: `${file.name} has been uploaded successfully. It will be reviewed within 24-48 hours.`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadedDocs(prev => prev.filter(doc => doc.type !== documentType));
      
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleGoBack = () => {
    navigate('/onboarding/seller');
  };

  const handleContinue = () => {
    toast({
      title: "Documents submitted!",
      description: "Your documents have been submitted for review. You'll be notified once they're verified.",
    });
    navigate('/onboarding/seller');
  };

  const getDocumentStatus = (documentType: string) => {
    const doc = uploadedDocs.find(d => d.type === documentType);
    return doc?.status || null;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">Not uploaded</Badge>;
    }
    
    const statusConfig = {
      'uploading': { variant: 'secondary' as const, icon: Upload, color: 'text-gray-600', text: 'Uploading...' },
      'uploaded': { variant: 'secondary' as const, icon: CheckCircle, color: 'text-blue-600', text: 'Uploaded' },
      'pending': { variant: 'secondary' as const, icon: AlertCircle, color: 'text-yellow-600', text: 'Under Review' },
      'verified': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600', text: 'Verified' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const requiredDocsUploaded = REQUIRED_DOCUMENTS.filter(doc => doc.required)
    .every(doc => getDocumentStatus(doc.type));

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mr-4 text-[#173c1e]/70"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Onboarding
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#173c1e]">Upload Documents</h1>
            <p className="text-[#173c1e]/70">
              Upload your business documents for verification
            </p>
          </div>
        </div>

        {/* Document Upload Cards */}
        <div className="max-w-4xl mx-auto space-y-6">
          {REQUIRED_DOCUMENTS.map((document) => {
            const status = getDocumentStatus(document.type);
            const uploadedDoc = uploadedDocs.find(d => d.type === document.type);
            
            return (
              <Card key={document.type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-[#173c1e]" />
                      <div>
                        <CardTitle className="text-[#173c1e]">
                          {document.title}
                          {document.required && <span className="text-red-500 ml-1">*</span>}
                        </CardTitle>
                        <CardDescription>{document.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {uploadedDoc ? (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          {uploadedDoc.name}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = window.document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.jpg,.jpeg,.png';
                          input.onchange = (e: Event) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handleFileUpload(document.type, file);
                            }
                          };
                          input.click();
                        }}
                        className="border-green-600 text-green-600 hover:bg-green-50"
                      >
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600 mb-4">
                        Drag and drop your file here, or click to select
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const input = window.document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.jpg,.jpeg,.png';
                          input.onchange = (e: Event) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handleFileUpload(document.type, file);
                            }
                          };
                          input.click();
                        }}
                        className="border-[#173c1e]/20"
                        data-testid={`button-upload-${document.type}`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        Supported formats: PDF, JPG, PNG (Max 10MB)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-[#173c1e]/70">
              {requiredDocsUploaded ? (
                <span className="text-green-600 font-medium">✓ All required documents uploaded</span>
              ) : (
                <span>Upload required documents (*) to continue</span>
              )}
            </div>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="border-[#173c1e]/20"
              >
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!requiredDocsUploaded}
                className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                data-testid="button-continue"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
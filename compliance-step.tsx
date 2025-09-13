import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertDocument } from "@shared/schema";

interface ComplianceStepProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
  currentStep: number;
  totalSteps: number;
}

export function ComplianceStep({ 
  form, 
  onNext, 
  onPrevious, 
  currentStep, 
  totalSteps 
}: ComplianceStepProps) {
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for uploaded files
  const [uploadedCoaFiles, setUploadedCoaFiles] = useState<any[]>([]);
  const [uploadedLicenseFiles, setUploadedLicenseFiles] = useState<any[]>([]);
  
  // Mutation to create document records
  const createDocumentMutation = useMutation({
    mutationFn: async (data: InsertDocument) => {
      const res = await apiRequest("POST", "/api/documents", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "Your compliance document has been successfully uploaded and recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle COA file upload completion
  const handleCoaFilesUploaded = (files: any[]) => {
    setUploadedCoaFiles(files);
    
    // Create document record for COA
    if (files.length > 0 && user) {
      const file = files[0]; // Take the first uploaded file
      const documentData: InsertDocument = {
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        objectPath: file.objectPath,
        documentType: 'coa',
        description: 'Certificate of Analysis uploaded during listing creation',
      };
      
      createDocumentMutation.mutate(documentData);
      
      // Update form with file name for validation
      form.setValue("coaDocument", file.name);
    }
  };

  // Handle license files upload completion
  const handleLicenseFilesUploaded = (files: any[]) => {
    setUploadedLicenseFiles(files);
    
    // Create document records for licenses
    if (files.length > 0 && user) {
      files.forEach((file) => {
        const documentData: InsertDocument = {
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          objectPath: file.objectPath,
          documentType: 'license',
          description: 'License/Certificate uploaded during listing creation',
        };
        
        createDocumentMutation.mutate(documentData);
      });
      
      // Update form with file names for validation
      const existingFiles = form.getValues("certificatesDocuments") || [];
      form.setValue("certificatesDocuments", [...existingFiles, ...files.map(f => f.name)]);
    }
  };
  
  // Check if user already has required documents uploaded
  const { data: userDocuments = [] } = useQuery({
    queryKey: ['/api/documents', user?.id],
    enabled: !!user?.id,
  });

  // Check for existing COA and license documents
  const existingCOA = Array.isArray(userDocuments) ? userDocuments.find((doc: any) => doc.documentType === 'coa') : undefined;
  const existingLicenses = Array.isArray(userDocuments) ? userDocuments.filter((doc: any) => 
    ['license', 'certificate', 'registration'].includes(doc.documentType)
  ) : [];

  const hasRequiredDocuments = existingCOA && existingLicenses.length > 0;

  // If user has all required documents, auto-populate form and allow skipping
  if (hasRequiredDocuments && !form.getValues("coaDocument")) {
    form.setValue("coaDocument", existingCOA.originalName);
    form.setValue("certificatesDocuments", existingLicenses.map((doc: any) => doc.originalName));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep} of {totalSteps}: Compliance & Trust</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <div className="space-y-4">
              {hasRequiredDocuments && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Documents Already Uploaded</span>
                  </div>
                  <p className="text-sm text-green-700">
                    You've already uploaded the required compliance documents during your organization setup. 
                    You can proceed to the next step or upload additional documents if needed.
                  </p>
                </div>
              )}

              {/* Certificate of Analysis */}
              <FormField
                control={form.control}
                name="coaDocument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate of Analysis (COA) *</FormLabel>
                    <FormControl>
                      {existingCOA ? (
                        <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                          <div className="flex items-center justify-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div className="text-center">
                              <p className="text-sm font-medium text-green-800">
                                ✓ {existingCOA.originalName}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                Uploaded on {new Date(existingCOA.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={10485760} // 10MB
                              uploadType="document"
                              onFilesUploaded={handleCoaFilesUploaded}
                              buttonClassName="w-full text-xs"
                            >
                              Upload different COA (optional)
                            </ObjectUploader>
                          </div>
                        </div>
                      ) : (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760} // 10MB
                          uploadType="document"
                          onFilesUploaded={handleCoaFilesUploaded}
                          buttonClassName="w-full"
                        >
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                Click to upload COA document
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                PDF, JPG, PNG up to 10MB
                              </p>
                            </div>
                          </div>
                        </ObjectUploader>
                      )}
                    </FormControl>
                    <FormDescription>
                      Required for publishing. Upload lab test results or quality analysis.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Licenses and Certificates */}
              <FormField
                control={form.control}
                name="certificatesDocuments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Licenses & Certificates *</FormLabel>
                    <FormControl>
                      {existingLicenses.length > 0 ? (
                        <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                          <div className="space-y-3">
                            {existingLicenses.map((license: any, index: number) => (
                              <div key={index} className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-green-800">
                                    ✓ {license.originalName}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {license.documentType} • Uploaded on {new Date(license.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4">
                            <ObjectUploader
                              maxNumberOfFiles={5}
                              maxFileSize={10485760} // 10MB
                              uploadType="document"
                              onFilesUploaded={handleLicenseFilesUploaded}
                              buttonClassName="w-full text-xs"
                            >
                              Upload additional licenses (optional)
                            </ObjectUploader>
                          </div>
                        </div>
                      ) : (
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={10485760} // 10MB
                          uploadType="document"
                          onFilesUploaded={handleLicenseFilesUploaded}
                          buttonClassName="w-full"
                        >
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                Click to upload licenses/certificates
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Business license, cultivation permit, etc.
                              </p>
                            </div>
                          </div>
                        </ObjectUploader>
                      )}
                    </FormControl>
                    <FormDescription>
                      Required for publishing. Upload business licenses, cultivation permits, or other relevant certificates.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status display */}
              <div className={`p-4 rounded-lg ${hasRequiredDocuments ? "bg-green-50" : "bg-blue-50"}`}>
                <h4 className={`font-medium mb-2 ${hasRequiredDocuments ? "text-green-900" : "text-blue-900"}`}>
                  Compliance Status:
                </h4>
                <div className={`space-y-1 text-sm ${hasRequiredDocuments ? "text-green-700" : "text-blue-700"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${existingCOA || form.getValues("coaDocument") ? "bg-green-500" : "bg-gray-300"}`} />
                    <span>COA Document: {existingCOA || form.getValues("coaDocument") ? "✓ Available" : "Required"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${existingLicenses.length > 0 || (form.getValues("certificatesDocuments")?.length > 0) ? "bg-green-500" : "bg-gray-300"}`} />
                    <span>Licenses/Certificates: {
                      existingLicenses.length > 0 || (form.getValues("certificatesDocuments")?.length > 0) 
                        ? `✓ Available (${existingLicenses.length + (form.getValues("certificatesDocuments")?.length || 0)} documents)` 
                        : "Required"
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Commercials
        </Button>
        <Button onClick={onNext}>
          Next: Media
        </Button>
      </div>
    </div>
  );
}
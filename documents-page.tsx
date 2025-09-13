import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document, InsertDocument } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { 
  Loader2, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Shield, 
  CreditCard, 
  UserCheck, 
  FileCheck,
  Calendar,
  Filter,
  Plus
} from "lucide-react";

import { ObjectUploader } from "@/components/ObjectUploader";

// Document types mapping
const documentTypeLabels = {
  // Buyer document types
  'id_doc': 'ID Document',
  'proof_of_address': 'Proof of Address',
  // Seller document types
  'coa': 'Certificate of Analysis',
  'license': 'Business License', 
  'certificate': 'Certificate',
  'insurance': 'Insurance Document',
  'registration': 'Registration Document'
};

const documentTypeIcons = {
  // Buyer document types
  'id_doc': UserCheck,
  'proof_of_address': FileText,
  // Seller document types
  'coa': FileCheck,
  'license': Shield,
  'certificate': UserCheck,
  'insurance': CreditCard,
  'registration': FileText
};

// Document upload form schema
const documentFormSchema = z.object({
  documentType: z.enum(['id_doc', 'proof_of_address', 'coa', 'license', 'certificate', 'insurance', 'registration'], {
    required_error: "Please select a document type"
  }),
  description: z.string().optional(),
  expiryDate: z.string().optional().transform(val => val === "" ? undefined : val),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Fetch user documents
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Document upload form
  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      documentType: undefined,
      description: "",
      expiryDate: "",
    },
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: InsertDocument) => {
      const res = await apiRequest("POST", "/api/documents", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "Your document has been successfully uploaded and recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsUploadDialogOpen(false);
      documentForm.reset();
      setUploadedFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload completion
  const handleFilesUploaded = (files: any[]) => {
    setUploadedFiles(files);
    // Since ObjectUploader now automatically creates database records,
    // we can close the dialog immediately after successful upload
    if (files.length > 0) {
      toast({
        title: "Document uploaded",
        description: "Your document has been successfully uploaded and recorded.",
      });
      setIsUploadDialogOpen(false);
      documentForm.reset();
      setUploadedFiles([]);
    }
  };

  // Handle document form submission (now just validates the form)
  function onDocumentSubmit(data: DocumentFormValues) {
    if (!data.documentType) {
      toast({
        title: "Document type required",
        description: "Please select a document type before uploading.",
        variant: "destructive",
      });
      return;
    }
    
    // The upload button will be enabled only when documentType is selected
    // ObjectUploader will handle the actual upload and database record creation
  }

  // Filter documents
  const filteredDocuments = documents
    ? documents.filter(doc => {
        if (selectedFilter === "all") return true;
        return doc.documentType === selectedFilter;
      })
    : [];

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  // Get verification status badge
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Download document
  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Document table columns
  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: "documentType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("documentType") as string;
        const Icon = documentTypeIcons[type as keyof typeof documentTypeIcons] || FileText;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{documentTypeLabels[type as keyof typeof documentTypeLabels] || type}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "originalName",
      header: "File Name",
      cell: ({ row }) => {
        return (
          <div className="max-w-[200px] truncate">
            {row.getValue("originalName")}
          </div>
        );
      },
    },
    {
      accessorKey: "fileSize",
      header: "Size",
      cell: ({ row }) => {
        return formatFileSize(row.getValue("fileSize"));
      },
    },
    {
      accessorKey: "createdAt",
      header: "Uploaded",
      cell: ({ row }) => {
        return formatDate(row.getValue("createdAt"));
      },
    },
    {
      accessorKey: "expiryDate",
      header: "Expires",
      cell: ({ row }) => {
        const expiryDate = row.getValue("expiryDate") as Date | null;
        if (!expiryDate) return 'N/A';
        
        const isExpired = new Date(expiryDate) < new Date();
        const isExpiringSoon = new Date(expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000; // 30 days
        
        return (
          <div className={`${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}`}>
            {formatDate(expiryDate)}
          </div>
        );
      },
    },
    {
      accessorKey: "verificationStatus",
      header: "Status",
      cell: ({ row }) => {
        return getVerificationBadge(row.getValue("verificationStatus"));
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const document = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(document.id, document.originalName)}
              data-testid={`button-download-${document.id}`}
            >
              <Download className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`button-delete-${document.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{document.originalName}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteDocumentMutation.mutate(document.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6" data-testid="documents-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Document Management</h1>
            <p className="text-muted-foreground">
              Manage your compliance documents and certificates
            </p>
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new compliance document. Supported formats: PDF, DOC, DOCX, JPG, PNG
                </DialogDescription>
              </DialogHeader>
              <Form {...documentForm}>
                <form onSubmit={documentForm.handleSubmit(onDocumentSubmit)} className="space-y-4">
                  <FormField
                    control={documentForm.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-document-type">
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {user?.role === 'buyer' ? (
                              <>
                                <SelectItem value="id_doc">ID Document</SelectItem>
                                <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="coa">Certificate of Analysis</SelectItem>
                                <SelectItem value="license">Business License</SelectItem>
                                <SelectItem value="certificate">Certificate</SelectItem>
                                <SelectItem value="insurance">Insurance Document</SelectItem>
                                <SelectItem value="registration">Registration Document</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={documentForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add a description for this document..."
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={documentForm.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-expiry-date"
                          />
                        </FormControl>
                        <FormDescription>
                          Leave empty if the document doesn't expire
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upload File</label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      uploadType="document"
                      documentType={documentForm.watch("documentType")}
                      description={documentForm.watch("description")}
                      expiryDate={documentForm.watch("expiryDate")}
                      onFilesUploaded={handleFilesUploaded}
                      buttonClassName="w-full"
                    >
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX, JPG, PNG up to 10MB
                        </p>
                      </div>
                    </ObjectUploader>
                    {uploadedFiles.length > 0 && (
                      <div className="text-sm text-green-600">
                        ✓ File uploaded: {uploadedFiles[0].name}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUploadDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Select document type and description above, then use the upload area to upload your file. 
                      The document will be automatically recorded in your repository.
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Document Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-documents">
                {documents?.length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-verified-documents">
                {documents?.filter(d => d.verificationStatus === 'approved').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending-documents">
                {documents?.filter(d => d.verificationStatus === 'pending').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-expiring-documents">
                {documents?.filter(d => {
                  if (!d.expiryDate) return false;
                  const expiryDate = new Date(d.expiryDate);
                  const thirtyDaysFromNow = new Date();
                  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                  return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Filter */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Documents</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="filter-document-type">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    {user?.role === 'buyer' ? (
                      <>
                        <SelectItem value="id_doc">ID Document</SelectItem>
                        <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="coa">Certificate of Analysis</SelectItem>
                        <SelectItem value="license">Business License</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="registration">Registration</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8" data-testid="no-documents-message">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedFilter === "all" 
                    ? "Get started by uploading your first document."
                    : `No ${documentTypeLabels[selectedFilter as keyof typeof documentTypeLabels]} documents found.`
                  }
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredDocuments}
                searchKey="originalName"
                searchPlaceholder="Search documents..."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
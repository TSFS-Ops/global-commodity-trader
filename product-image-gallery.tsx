import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ProductImageGallery({ 
  images, 
  productName, 
  className 
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  if (!images.length) {
    return (
      <div className={cn("bg-gray-100 rounded-lg flex items-center justify-center h-96", className)}>
        <div className="text-center text-gray-500">
          <div className="w-24 h-24 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Package size={32} />
          </div>
          <p>No images available</p>
        </div>
      </div>
    );
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out this ${productName}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[selectedImage];
    link.download = `${productName}-image-${selectedImage + 1}.jpg`;
    link.click();
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
    handleReset();
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
    handleReset();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image Display */}
      <div className="relative bg-white rounded-lg border overflow-hidden group">
        <div className="aspect-square relative">
          <img
            src={images[selectedImage]}
            alt={`${productName} - Image ${selectedImage + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsZoomOpen(true)}
                className="bg-white/90 hover:bg-white"
              >
                <Maximize2 size={16} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleShare}
                className="bg-white/90 hover:bg-white"
              >
                <Share2 size={16} />
              </Button>
            </div>

            {/* Image Navigation */}
            {images.length > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={prevImage}
                  className="rounded-full bg-white/90 hover:bg-white"
                  disabled={images.length <= 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={nextImage}
                  className="rounded-full bg-white/90 hover:bg-white"
                  disabled={images.length <= 1}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <Badge className="absolute bottom-4 left-4 bg-black/70 text-white">
              {selectedImage + 1} / {images.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                selectedImage === index
                  ? "border-[#a8c566] ring-2 ring-[#a8c566]/20"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <img
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Advanced Zoom Dialog */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
          <div className="relative h-full bg-black">
            {/* Zoom Controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="bg-white/90 hover:bg-white"
                >
                  <ZoomOut size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 5}
                  className="bg-white/90 hover:bg-white"
                >
                  <ZoomIn size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRotate}
                  className="bg-white/90 hover:bg-white"
                >
                  <RotateCw size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleReset}
                  className="bg-white/90 hover:bg-white"
                >
                  Reset
                </Button>
              </div>

              <div className="flex gap-2">
                <Badge className="bg-black/70 text-white">
                  {Math.round(zoomLevel * 100)}%
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownload}
                  className="bg-white/90 hover:bg-white"
                >
                  <Download size={16} />
                </Button>
              </div>
            </div>

            {/* Zoomable Image */}
            <div 
              className="h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={images[selectedImage]}
                alt={`${productName} - Zoomed view`}
                className="max-h-full max-w-full object-contain transition-transform"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  if (e.deltaY < 0) {
                    handleZoomIn();
                  } else {
                    handleZoomOut();
                  }
                }}
                draggable={false}
              />
            </div>

            {/* Navigation in zoom mode */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={prevImage}
                  className="bg-white/90 hover:bg-white rounded-full"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Badge className="bg-black/70 text-white px-3 py-1">
                  {selectedImage + 1} / {images.length}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={nextImage}
                  className="bg-white/90 hover:bg-white rounded-full"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
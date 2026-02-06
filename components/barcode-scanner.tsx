"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Camera, X, Flashlight, RotateCcw } from "lucide-react";

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

    // Initialize the barcode reader
    useEffect(() => {
        readerRef.current = new BrowserMultiFormatReader();

        // Get available video devices
        navigator.mediaDevices
            .enumerateDevices()
            .then((allDevices) => {
                const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
                setDevices(videoDevices);
                // Try to find back camera
                const backCameraIndex = videoDevices.findIndex(
                    (d) =>
                        d.label.toLowerCase().includes("back") ||
                        d.label.toLowerCase().includes("rear")
                );
                if (backCameraIndex !== -1) {
                    setSelectedDeviceIndex(backCameraIndex);
                }
            })
            .catch(console.error);

        return () => {
            stopScanning();
        };
    }, []);

    const startScanning = useCallback(async () => {
        if (!readerRef.current || !videoRef.current) return;

        try {
            const deviceId = devices[selectedDeviceIndex]?.deviceId ?? null;

            await readerRef.current.decodeFromVideoDevice(
                deviceId,
                videoRef.current,
                (result, error) => {
                    if (result) {
                        const barcode = result.getText();
                        onScan(barcode);
                        stopScanning();
                    }
                    if (error && !(error instanceof NotFoundException)) {
                        console.error("Scan error:", error);
                    }
                }
            );

            setIsScanning(true);
            setHasPermission(true);
        } catch (error) {
            console.error("Failed to start scanner:", error);
            setHasPermission(false);
            onError?.("Failed to access camera. Please grant permission.");
        }
    }, [devices, selectedDeviceIndex, onScan, onError]);

    const stopScanning = useCallback(() => {
        if (readerRef.current) {
            readerRef.current.reset();
        }
        setIsScanning(false);
    }, []);

    const switchCamera = useCallback(() => {
        if (devices.length > 1) {
            stopScanning();
            setSelectedDeviceIndex((prev) => (prev + 1) % devices.length);
        }
    }, [devices.length, stopScanning]);

    // Restart scanning when device changes
    useEffect(() => {
        if (isScanning) {
            stopScanning();
            setTimeout(startScanning, 100);
        }
    }, [selectedDeviceIndex]);

    if (hasPermission === false) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
                    <Camera className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Camera Access Required</h3>
                <p className="text-sm text-neutral-500">
                    Please allow camera access to scan barcodes
                </p>
                <Button onClick={startScanning} variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black">
            {/* Video feed */}
            <video
                ref={videoRef}
                className={`w-full aspect-[4/3] object-cover ${isScanning ? "opacity-100" : "opacity-0"
                    }`}
                playsInline
                muted
            />

            {/* Scanning overlay */}
            {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Darkened corners */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Scanning window */}
                    <div className="relative w-64 h-40 z-10">
                        <div className="absolute inset-0 bg-transparent" />
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                        {/* Scanning line animation */}
                        <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan" />
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        {devices.length > 1 && (
                            <Button
                                size="icon"
                                variant="secondary"
                                className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30"
                                onClick={switchCamera}
                            >
                                <RotateCcw className="h-5 w-5 text-white" />
                            </Button>
                        )}
                        <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30"
                            onClick={stopScanning}
                        >
                            <X className="h-5 w-5 text-white" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Start button when not scanning */}
            {!isScanning && (
                <button
                    onClick={startScanning}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-neutral-900 to-neutral-800"
                >
                    <div className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 p-6 shadow-2xl shadow-emerald-500/30 transition-transform hover:scale-110">
                        <Camera className="h-10 w-10 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-white">
                        Tap to Scan Barcode
                    </span>
                    <span className="text-sm text-neutral-400">
                        Point your camera at a product barcode
                    </span>
                </button>
            )}
        </div>
    );
}

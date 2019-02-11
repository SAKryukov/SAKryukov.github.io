namespace AnamorphicDrawing.Main {
    using System;
    using System.Windows;
    using System.Windows.Media.Imaging;

    class PerspectiveTransform {

        internal PerspectiveTransform(double horizontalScaleFrom, double horizontalScaleTo) {
            this.horizontalScaleFrom = horizontalScaleFrom;
            this.horizontalScaleTo = horizontalScaleTo;
            this.maxHorizontalScale = Math.Max(horizontalScaleFrom, horizontalScaleTo);
        } //PerspectiveTransform

        internal BitmapSource Apply(BitmapSource source) {
            int destinationWidth = (int)Math.Round(maxHorizontalScale * source.PixelWidth);
            WriteableBitmap destination = new WriteableBitmap(destinationWidth, source.PixelHeight, source.DpiX, source.DpiY, source.Format, source.Palette);
            int bytesPerPixel = destination.BackBufferStride / destinationWidth;
            int sourceStride = bytesPerPixel * source.PixelWidth;
            int destinationStride = bytesPerPixel * destinationWidth;
            byte[] sourceArray = new byte[sourceStride];
            byte[] destinationArray = new byte[destinationStride];
            byte fillByte = (source.Format.Masks.Count == 4) ? (byte)0 : (byte)0xff;
            double factor = (horizontalScaleTo - horizontalScaleFrom) / source.PixelHeight; // compression(y) = compressionFrom + factor * y
            if (UseInterpolation == Interpolation.Linear)
                LinearInterpolation(factor, bytesPerPixel, source, destination, destinationWidth, sourceArray, destinationArray, sourceStride, destinationStride, fillByte);
            else
                NearestNeighborInterpolation(factor, bytesPerPixel, source, destination, destinationWidth, sourceArray, destinationArray, sourceStride, destinationStride, fillByte);
            return destination;
        } //Apply

        void NearestNeighborInterpolation(double factor, int bytesPerPixel, BitmapSource source, WriteableBitmap destination, int destinationWidth, byte[] sourceArray, byte[] destinationArray, int sourceStride, int destinationStride, byte fillByte) {
            for (int y = 0; y < destination.PixelHeight - 1; ++y) {
                double compression = horizontalScaleFrom + factor * y;
                source.CopyPixels(new Int32Rect(0, y, source.PixelWidth, 1), sourceArray, sourceStride, 0);
                for (int х = 0; х < destinationWidth; ++х) {
                    double shift = (source.PixelWidth * compression - destinationWidth) / 2d;
                    double xSrc = (х + shift) / compression;
                    int xSrcAddress = (int)Math.Round(xSrc);
                    for (byte byteIndex = 0; byteIndex < bytesPerPixel; ++byteIndex)
                        if (xSrcAddress >= 0 && xSrcAddress < source.PixelWidth)
                            destinationArray[х * bytesPerPixel + byteIndex] = sourceArray[xSrcAddress * bytesPerPixel + byteIndex];
                        else
                            destinationArray[х * bytesPerPixel + byteIndex] = fillByte;
                } //loop x
                destination.WritePixels(new Int32Rect(0, y, destinationWidth, 1), destinationArray, destinationStride, 0);
            } //loop y
        } //NearestNeighborInterpolation

        void LinearInterpolation(double factor, int bytesPerPixel, BitmapSource source, WriteableBitmap destination, int destinationWidth, byte[] sourceArray, byte[] destinationArray, int sourceStride, int destinationStride, byte fillByte) {
            for (int y = 0; y < destination.PixelHeight - 1; ++y) {
                double compression = horizontalScaleFrom + factor * y;
                int sourcePixelWidthMinusOne = source.PixelWidth;
                source.CopyPixels(new Int32Rect(0, y, source.PixelWidth, 1), sourceArray, sourceStride, 0);
                for (int х = 0; х < destinationWidth; ++х) {
                    double shift = (source.PixelWidth * compression - destinationWidth) / 2d;
                    double xSrc = (х + shift) / compression;
                    int xSrcCurrent = (int)xSrc;
                    int xSrcNext = (xSrcCurrent == sourcePixelWidthMinusOne) ? xSrcCurrent : xSrcCurrent + 1;
                    double deltaX = xSrc - xSrcCurrent;
                    for (byte byteIndex = 0; byteIndex < bytesPerPixel; ++byteIndex)
                        if (xSrcCurrent >= 0 && xSrcNext < source.PixelWidth) {
                            if (xSrcCurrent != xSrcNext) {
                                double y1 = sourceArray[xSrcCurrent * bytesPerPixel + byteIndex];
                                double y2 = sourceArray[xSrcNext * bytesPerPixel + byteIndex];
                                destinationArray[х * bytesPerPixel + byteIndex] = (byte)(y1 + (y2 - y1) * deltaX);
                            } else
                                destinationArray[х * bytesPerPixel + byteIndex] = sourceArray[xSrcCurrent * bytesPerPixel + byteIndex];
                        } else
                            destinationArray[х * bytesPerPixel + byteIndex] = fillByte;
                } //loop x
                destination.WritePixels(new Int32Rect(0, y, destinationWidth, 1), destinationArray, destinationStride, 0);
            } //loop y
        } //LinearInterpolation

        internal double HorizontalScaleFrom { get { return horizontalScaleFrom; } }
        internal double HorizontalScaleTo { get { return horizontalScaleTo; } }
        internal enum Interpolation { Linear, NearestNeighbor, }
        internal Interpolation UseInterpolation { get; set; }

        double horizontalScaleFrom, horizontalScaleTo, maxHorizontalScale;

    } //class PerspectiveTransform

} //namespace AnamorphicDrawing.Main

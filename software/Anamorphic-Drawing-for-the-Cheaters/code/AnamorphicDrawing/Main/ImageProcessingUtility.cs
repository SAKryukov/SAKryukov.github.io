namespace AnamorphicDrawing.Main {
    using System.IO;
    using System.Windows;
    using System.Windows.Media;
    using System.Windows.Media.Imaging;
    using System.Windows.Controls;
    using PrintDialog = System.Windows.Controls.PrintDialog;
    using DrawingVisual = System.Windows.Media.DrawingVisual;

    static class ImageProcessingUtility {

        const double fundamentallyLowSize = 2;

        internal static void SaveBitmap(BitmapSource source, string fileName) {
            using (FileStream fs = new FileStream(fileName, FileMode.Create)) {
                PngBitmapEncoder encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(source));
                encoder.Save(fs);
            } //using
        } //saveBitmap
        
        internal static void ArrangeImage(BitmapSource bitmap, Image image, Canvas canvas) {
            if (bitmap == null) return;
            double imageAspect = (double)bitmap.Width / (double)bitmap.Height;
            double parentAspect = (double)canvas.ActualWidth / (double)canvas.ActualHeight;
            if (imageAspect > parentAspect) {
                image.Width = canvas.ActualWidth;
                image.Height = image.Width / imageAspect;
                Canvas.SetLeft(image, 0);
                Canvas.SetTop(image, (canvas.ActualHeight - image.Height) / 2);
            } else {
                image.Height = canvas.ActualHeight;
                image.Width = image.Height * imageAspect;
                Canvas.SetTop(image, 0);
                Canvas.SetLeft(image, (canvas.ActualWidth - image.Width) / 2);
            } //if
        } //ArrangeImage

        internal static void PrintImage(BitmapSource imageSource) {
            if (imageSource == null) return;
            if (imageSource.PixelWidth < 1 || imageSource.PixelHeight < 1) return;
            var printDialog = new PrintDialog();
            if (printDialog.ShowDialog() != true) return;
            double printableWidth = printDialog.PrintableAreaWidth;
            double printableHeight = printDialog.PrintableAreaHeight;
            double imageAspect = imageSource.PixelWidth / imageSource.PixelHeight;
            double printAspect = printableWidth / printableHeight;
            if ((imageAspect > 1 && printAspect < 1) || (imageAspect < 1 && printAspect > 1)) {
                imageSource = new TransformedBitmap(imageSource, new RotateTransform(90));
                imageAspect = 1 / imageAspect;
            } //if
            double x0, y0, width, height;
            if (imageAspect > printAspect) {
                width = printableWidth;
                height = width / imageAspect;
                x0 = 0; y0 = (printableHeight - height) / 2;
            } else {
                height = printableHeight;
                width = height * imageAspect;
                y0 = 0; x0 = (printableWidth - width) / 2;
            } //if
            var drawingVisual = new DrawingVisual();
            var dc = drawingVisual.RenderOpen();
            try {
                dc.DrawImage(imageSource, new Rect(x0, y0, width, height));
            } finally { dc.Close(); }
            printDialog.PrintVisual(drawingVisual, null);
        } //PrintImage

        internal class MarkFactorSet {
            delegate void SwapMethod(ref double smaller, ref double greater);
            internal MarkFactorSet() { IsValid = false; }
            internal MarkFactorSet(Point topLeft, Point topRight, Point bottomRight, Point bottomLeft, int bitmapPixelHeight, double bitmapAspect, double scale) {
                SwapMethod swap = delegate(ref double smaller, ref double greater) {
                    if (smaller > greater) {
                        double temp = smaller;
                        smaller = greater;
                        greater = temp;
                    } //if
                }; //swap
                this.LongSide = bottomRight.X - bottomLeft.X;
                if (LongSide < 0) LongSide = -LongSide;
                this.ShortSide = topRight.X - topLeft.X;
                if (ShortSide < 0) ShortSide = -ShortSide;
                swap(ref ShortSide, ref LongSide);
                this.LowerY = (bottomLeft.Y + bottomRight.Y) / 2;
                this.UpperY = (topLeft.Y + topRight.Y) / 2;
                swap(ref UpperY, ref LowerY); // lowerY should be greater the upperY
                this.Height = LowerY - UpperY;
                IsValid = Height > fundamentallyLowSize && ShortSide > fundamentallyLowSize && LongSide > fundamentallyLowSize; //SA???
                if (!IsValid) return;
                Scale(scale);
                double denominator = ShortSide * LowerY - LongSide * UpperY;
                double markWidth = bitmapAspect * Height;
                double factor = (markWidth / ShortSide - markWidth / LongSide) / (UpperY - LowerY);
                HorizontalScaleFrom = markWidth / ShortSide - factor * UpperY;
                HorizontalScaleTo = HorizontalScaleFrom + factor * bitmapPixelHeight;
                IsValid = HorizontalScaleFrom > 0 && HorizontalScaleTo > 0;
            } //MarkFactoSet
            void Scale(double factor) {
                LongSide *= factor;
                ShortSide *= factor;
                UpperY *= factor;
                LowerY *= factor;
                Height *= factor;
            } //Scale
            internal bool IsValid { get; private set; }
            internal double LongSide;
            internal double ShortSide;
            internal double UpperY;
            internal double LowerY;
            internal double Height;
            internal double HorizontalScaleFrom;
            internal double HorizontalScaleTo;
        } //class MarkFactoSet

        internal static BitmapSource PerspectiveTransformFromRelativePoints(BitmapSource bitmap, Point topLeft, Point topRight, Point bottomRight, Point bottomLeft, double imageWidth) {
            double bitmapAspect = (double)bitmap.PixelWidth / (double)bitmap.PixelHeight;
            MarkFactorSet factorSet = new MarkFactorSet(topLeft, topRight, bottomRight, bottomLeft, bitmap.PixelHeight, bitmapAspect, bitmap.PixelWidth / imageWidth);
            if (!factorSet.IsValid) return null;
            return new PerspectiveTransform(factorSet.HorizontalScaleFrom, factorSet.HorizontalScaleTo).Apply(bitmap);
        } //PerspectiveTransformFromRelativePoints

    } //class ImageProcessingUtility

} //namespace AnamorphicDrawing.Main

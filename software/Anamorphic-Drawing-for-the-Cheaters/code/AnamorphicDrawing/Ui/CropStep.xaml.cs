namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Media.Imaging;

    public partial class CropStep : UserControl, Collaboration.ICollaborationProvider {
    
        public CropStep() {
            InitializeComponent();
            collaboration = new Collaboration(this, canvas, image, null, TransformImplementation);
            collaboration.InvokeStatusChanged(this,
                new Collaboration.StatusChangeEventArgs(
                    Collaboration.StatusChangeAspect.StatusLineMessageChange,
                    null,
                    canvas.DataContext.ToString()));
            CropGrip[] gripSet = new CropGrip[] { left, right, top, bottom };
            frameThickness = left.Width;
            coupler = new CropGripCoupler(image, gripSet, cropBorder, frameThickness);
            CropGrip focusedGrip = left;
            foreach (CropGrip grip in gripSet)
                grip.GotFocus += (sender, eventArgs) => {
                    focusedGrip = (CropGrip)sender;
                    collaboration.InvokeStatusChanged(this,
                        new Collaboration.StatusChangeEventArgs(
                            Collaboration.StatusChangeAspect.SelectonChange,
                            focusedGrip.Role.ToString(),
                            null));
                }; //grip.GotFocus
            bool firstTime = true;
            collaboration.VisibilityChanged += (sender, eventArgs) => {
                if (Visibility != Visibility.Visible) return;
                if (firstTime) Arrange();
                firstTime = false;
                if (focusedGrip != null)
                    focusedGrip.Focus();
            }; //collaboration.VisibilityChanged
        } //CropStep

        BitmapSource TransformImplementation() {
            double frameAroundImageX = (canvas.ActualWidth - image.ActualWidth) / 2;
            double frameAroundImageY = (canvas.ActualHeight - image.ActualHeight) / 2;
            double imageLeft = cropBorder.BorderThickness.Left - frameAroundImageX - frameThickness;
            if (imageLeft < 0) imageLeft = 0;
            double imageRight = cropBorder.BorderThickness.Right - frameAroundImageX - frameThickness;
            if (imageRight < 0) imageRight = 0;
            double imageTop = cropBorder.BorderThickness.Top - frameAroundImageY - frameThickness;
            if (imageTop < 0) imageTop = 0;
            double imageBottom = cropBorder.BorderThickness.Bottom - frameAroundImageY - frameThickness;
            if (imageBottom < 0) imageBottom = 0;
            double scale = collaboration.BitmapSource.PixelWidth/image.Width;
            imageLeft *= scale; imageRight *= scale; imageTop *= scale; imageBottom *= scale;
            int x = (int)Math.Round(imageLeft);
            int y = (int)Math.Round(imageTop);
            int width = (int)collaboration.BitmapSource.PixelWidth - x - (int)Math.Round(imageRight);
            int height = (int)collaboration.BitmapSource.PixelHeight - y - (int)Math.Round(imageBottom);
            return new CroppedBitmap(collaboration.BitmapSource, new Int32Rect(x, y, width, height));
        } //TransformImplementation

        void Arrange() {
            if (Visibility != Visibility.Visible) return;
            Main.ImageProcessingUtility.ArrangeImage(collaboration.BitmapSource, image, canvas);
            coupler.Arrange();
        } //Arrange

        protected override void OnRenderSizeChanged(SizeChangedInfo sizeInfo) { Arrange(); }

        Collaboration collaboration;
        Collaboration Collaboration.ICollaborationProvider.Collaboration { get { return collaboration; } }
        CropGripCoupler coupler;
        double frameThickness;

    } //class CropStep

} //namespace AnamorphicDrawing.Ui

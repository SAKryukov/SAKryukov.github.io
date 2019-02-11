namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Media.Imaging;
    using DispatcherPriority = System.Windows.Threading.DispatcherPriority;

    public partial class FirstStep : UserControl, Collaboration.ICollaborationProvider {
                
        public FirstStep() {
            InitializeComponent();
            collaboration = new Collaboration(this, canvas, image, CanGoNextImplementation, TransformImplementation);            
            LocationGrip[] gripSet = new LocationGrip[] { topLeft, topRight, bottomRight, bottomLeft };
            locationGripCoupler = new LocationGripCoupler(image, gripSet, pad, mark);
            LocationGrip focusedGrip = null;
            collaboration.VisibilityChanged += (sender, eventArgs) => {
                if (Visibility != Visibility.Visible) return;
                if (focusedGrip != null)
                    focusedGrip.Focus();
            }; //collaboration.VisibilityChanged
            foreach (var grip in gripSet) {
                grip.GotFocus += (sender, eventArgs) => {
                    focusedGrip = (LocationGrip)sender;
                    collaboration.InvokeStatusChanged(this, new Collaboration.StatusChangeEventArgs(Collaboration.StatusChangeAspect.SelectonChange, focusedGrip.DataContext.ToString(), null));
                };
                grip.LocationChanged += (sender, eventArgs) => {
                    this.validGripPositions = АreValidGripPositions();
                    if (this.validGripPositions)
                        collaboration.InvokeStatusChanged(this, new Collaboration.StatusChangeEventArgs(Collaboration.StatusChangeAspect.NextEnabledChange | Collaboration.StatusChangeAspect.StatusLineMessageChange, null, permanentStatusMessage));
                    else
                        collaboration.InvokeStatusChanged(this, new Collaboration.StatusChangeEventArgs(Collaboration.StatusChangeAspect.NextEnabledChange | Collaboration.StatusChangeAspect.StatusLineMessageChange, null, invalidStatusMessage));
                }; //grip.LocationChanged
            } //loop
            permanentStatusMessage = canvas.DataContext.ToString();
            invalidStatusMessage = image.DataContext.ToString();
        } //FirstStep

        bool alreadyRendered;
        protected override void OnRender(System.Windows.Media.DrawingContext drawingContext) {
            base.OnRender(drawingContext);
            Dispatcher.BeginInvoke(new System.Action(() => { collaboration.InvokeStatusChanged(this, new Collaboration.StatusChangeEventArgs(Collaboration.StatusChangeAspect.StatusLineMessageChange, null, permanentStatusMessage)); }));
            if (!alreadyRendered) {
                Dispatcher.BeginInvoke(new System.Action(() => {
                    bottomRight.Focus();
                }));
                Dispatcher.BeginInvoke(DispatcherPriority.ApplicationIdle, new System.Action(() => {
                    topLeft.Focus();
                }));
            } //alreadyRendered
            alreadyRendered = true;
        } //OnRender

        protected override void OnRenderSizeChanged(SizeChangedInfo sizeInfo) {
            Main.ImageProcessingUtility.ArrangeImage(collaboration.BitmapSource, image, canvas);
            locationGripCoupler.Arrange(new Point(bottomLeft.ActualWidth/2, bottomLeft.ActualHeight/2), new Size(canvas.ActualWidth, canvas.ActualHeight));
        } //protected override void OnRenderSizeChanged(SizeChangedInfo sizeInfo)

        BitmapSource TransformImplementation() {
            return Main.ImageProcessingUtility.PerspectiveTransformFromRelativePoints(collaboration.BitmapSource, topLeft.Location, topRight.Location, bottomRight.Location, bottomLeft.Location, image.Width);
        } //TransformImplementation
        bool CanGoNextImplementation() { return validGripPositions; }

        bool АreValidGripPositions() {
            if (collaboration.BitmapSource == null) return true;
            int bitmapPixelWidth = collaboration.BitmapSource.PixelWidth;
            int bitmapPixelHeight = collaboration.BitmapSource.PixelHeight;
            Main.ImageProcessingUtility.MarkFactorSet factorSet = new Main.ImageProcessingUtility.MarkFactorSet(topLeft.Location, topRight.Location, bottomRight.Location, bottomLeft.Location,
                bitmapPixelHeight, (double)bitmapPixelWidth / (double)bitmapPixelHeight, bitmapPixelWidth / image.ActualWidth);
            return factorSet.IsValid;
        } //АreValidGripPositions

        Collaboration Collaboration.ICollaborationProvider.Collaboration { get { return collaboration; } }

        LocationGripCoupler locationGripCoupler;
        Collaboration collaboration;
        bool validGripPositions = true;
        string permanentStatusMessage, invalidStatusMessage;

    } //class FirstStep

} //namespace AnamorphicDrawing.Ui

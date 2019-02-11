namespace AnamorphicDrawing.Ui {
    using System.Windows;
    using System.Windows.Controls;

    public partial class FinishAndSaveStep : UserControl, Collaboration.ICollaborationProvider {
    
        public FinishAndSaveStep() {
            InitializeComponent();
            collaboration = new Collaboration(this, canvas, image, null, null);
            collaboration.InvokeStatusChanged(this,
                new Collaboration.StatusChangeEventArgs(
                    Collaboration.StatusChangeAspect.StatusLineMessageChange | Collaboration.StatusChangeAspect.SelectonChange,
                    image.DataContext.ToString(),
                    canvas.DataContext.ToString()));
        } //FinishAndSaveStep

        protected override void OnRenderSizeChanged(SizeChangedInfo sizeInfo) {
            Main.ImageProcessingUtility.ArrangeImage(collaboration.BitmapSource, image, canvas);
        } //OnRenderSizeChanged

        Collaboration collaboration;
        Collaboration Collaboration.ICollaborationProvider.Collaboration { get { return collaboration; } }

    } //class FinishAndSaveStep

} //namespace AnamorphicDrawing.Ui

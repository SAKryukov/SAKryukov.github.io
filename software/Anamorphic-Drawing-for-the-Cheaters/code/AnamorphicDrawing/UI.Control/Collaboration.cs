namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Media.Imaging;
    
    class Collaboration {

        internal interface ICollaborationProvider {
            Collaboration Collaboration { get; }
        } //interface ICollaborationProvider

        internal Collaboration(Control control, Canvas canvas, Image image, Func<bool> canGoNext, Func<BitmapSource> transform) {
            this.control = control;
            this.canvas = canvas;
            this.image = image;
            this.canGoNext = canGoNext;
            this.transform = transform;
        } //Collaboration

        internal BitmapSource BitmapSource {
            get { return bitmap; }
            set {                
                if (bitmap == value) return;
                bitmap = value;
                image.Source = bitmap;
                Main.ImageProcessingUtility.ArrangeImage(bitmap, image, canvas);
            } //get Bitmap
        } //Bitmap
        BitmapSource bitmap;

        internal BitmapSource Transform() {
            if (transform == null || BitmapSource == null)
                return null;
            else
                return transform();
        } //Transform

        internal Visibility Visibility {
            get { return control.Visibility; }
            set {
                if (VisibilityChanging != null)
                    VisibilityChanging.Invoke(this, new EventArgs());
                control.Visibility = value;
                if (VisibilityChanged != null)
                    VisibilityChanged.Invoke(this, new EventArgs());
                if (value == System.Windows.Visibility.Visible)
                    InvokeStatusChanged(this.control, new StatusChangeEventArgs(
                        StatusChangeAspect.SelectonChange | StatusChangeAspect.StatusLineMessageChange,
                        shadowSelectionInfo, shadowStatusLineMessage));
            } //set Visibility
        } //Visibility

        internal bool IsReadyForNext {
            get {
                if (BitmapSource == null) return false;
                if (canGoNext != null)
                    return canGoNext();
                else
                    return true;
            } //get IsReadyForNext
        } //IsReadyForNext

        internal enum StatusChangeAspect { NextEnabledChange = 1, SelectonChange = 2, StatusLineMessageChange = 4, }
        internal class StatusChangeEventArgs : EventArgs {
            internal StatusChangeEventArgs(StatusChangeAspect aspect, string selectionInfo, string statusLineMessage) {
                this.Aspect = aspect;
                this.SelectionInfo = selectionInfo;
                this.StatusMessage = statusLineMessage;
            } //StatusChangeEventArgs
            internal StatusChangeAspect Aspect { get; private set; }
            internal string SelectionInfo { get; private set; }
            internal string StatusMessage { get; private set; }
        } //StatusChangeEventArgs

        string shadowSelectionInfo = string.Empty;
        string shadowStatusLineMessage = string.Empty;

        internal void InvokeStatusChanged(Control sender, StatusChangeEventArgs eventArgs) { // for *Step controls
            if ((eventArgs.Aspect & Collaboration.StatusChangeAspect.SelectonChange) > 0 && eventArgs.SelectionInfo != null)
                shadowSelectionInfo = eventArgs.SelectionInfo;
            if ((eventArgs.Aspect & Collaboration.StatusChangeAspect.StatusLineMessageChange) > 0 && eventArgs.StatusMessage != null)
                shadowStatusLineMessage = eventArgs.StatusMessage;
            if (StatusChanged != null)
                StatusChanged.Invoke(sender, eventArgs);
        } //InvokeStatusChanged

        internal string WizardStep {
            get {
                if (control == null) return string.Empty;
                if (control.DataContext == null) return string.Empty;
                return (string)control.DataContext;
            } //get WizardStep
        } //WizardStep

        internal event EventHandler<StatusChangeEventArgs> StatusChanged; // for MainWindow
        internal event EventHandler VisibilityChanging, VisibilityChanged;

        Control control;
        Canvas canvas;
        Image image;
        Func<BitmapSource> transform;
        Func<bool> canGoNext;

    } //class Collaboration

} //namespace AnamorphicDrawing.Ui

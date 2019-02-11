namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Input;

    internal partial class LocationGrip : BaseGrip {

        void NotifyExclusiveSelection() {
            if (!(Keyboard.IsKeyDown(Key.LeftShift) || Keyboard.IsKeyDown(Key.RightShift)))
                if (OnSelectedExclusively != null)
                    OnSelectedExclusively.Invoke(this, new EventArgs());
        } //NotifyExclusiveSelection

        protected override void OnGotFocus(RoutedEventArgs e) {
            IsSelected = true;
            NotifyExclusiveSelection();
            base.OnGotFocus(e);
        } //OnGotFocus

        protected override void OnPreviewMouseDoubleClick(MouseButtonEventArgs e) {
            NotifyExclusiveSelection();
        } //protected override void OnPreviewMouseDoubleClick(MouseButtonEventArgs e)
        
        internal void MotionHandler(MotionEventArgs e) {
            Func<FrameworkElement, double, double, Point> curbPoint = (anElement, x, y) => {
                if (x < 0) x = 0;
                if (y < 0) y = 0;
                if (x >= anElement.ActualWidth) x = anElement.ActualWidth;
                if (y >= anElement.ActualHeight) y = anElement.ActualHeight;
                return new Point(x, y);
            }; //curbPoint
            Canvas canvas = (Canvas)this.Parent;
            if (e.Source == MoveSource.Drag) {
                double x = locatiobAtDragStart.X + e.Position.X - mouseLocationAtDragStart.X;
                double y = locatiobAtDragStart.Y + e.Position.Y - mouseLocationAtDragStart.Y;
                Location = curbPoint(canvas, x, y);
            } else if (e.Source == MoveSource.KeyPress)
                Location = curbPoint(canvas, Location.X + e.Position.X, Location.Y + e.Position.Y);
        } //MotionHandler

        internal event System.EventHandler OnSelectedExclusively;

    } //class LocationGrip

} //namespace AnamorphicDrawing.Ui

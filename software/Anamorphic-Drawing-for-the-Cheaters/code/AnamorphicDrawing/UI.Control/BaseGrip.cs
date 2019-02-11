namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Input;
    using ResizeGrip = System.Windows.Controls.Primitives.ResizeGrip;

    internal abstract class BaseGrip : ResizeGrip {

        internal enum MoveSource { KeyPress, Drag, }
        internal class MotionEventArgs : System.EventArgs {
            internal MotionEventArgs(MoveSource source, int index, Point position) {
                this.Source = source;
                this.Index = index; this.Position = position;
            }
            internal MoveSource Source { get; private set; }
            internal int Index { get; private set; }
            internal Point Position { get; private set; }
        } //MotionEventArgs

        protected override void OnPreviewMouseUp(MouseButtonEventArgs e) { ReleaseMouseCapture(); }

        protected virtual bool IsGoodMotionKey(KeyEventArgs e) {
            if (e.Key == Key.System) {
                return e.SystemKey == Key.Up || e.SystemKey == Key.Down || e.SystemKey == Key.Left || e.SystemKey == Key.Right;
            } else {
                return e.Key == Key.Up || e.Key == Key.Down || e.Key == Key.Left || e.Key == Key.Right;
            } //if
        } //IsGoodMotionKey

        protected override void OnPreviewKeyDown(KeyEventArgs e) {
            if (!(IsGoodMotionKey(e))) return;
            Key key = e.Key;
            if (e.Key == Key.System)
                key = e.SystemKey;
            var speed = 1;
            if (Keyboard.IsKeyDown(Key.LeftCtrl) || Keyboard.IsKeyDown(Key.LeftCtrl))
                speed *= 5;
            if (Keyboard.IsKeyDown(Key.LeftShift) || Keyboard.IsKeyDown(Key.RightShift))
                speed *= 5;
            if (Keyboard.IsKeyDown(Key.LeftAlt) || Keyboard.IsKeyDown(Key.RightAlt))
                speed *= 10;
            Point position = new Point(0, 0);
            if (key == Key.Up)
                position = new Point(0, -speed);
            else if (key == Key.Down)
                position = new Point(0, +speed);
            else if (key == Key.Left)
                position = new Point(-speed, 0);
            else if (key == Key.Right)
                position = new Point(+speed, 0);
            if (Moved != null)
                Moved.Invoke(this, new MotionEventArgs(MoveSource.KeyPress, this.Index, position));
            e.Handled = e.Key != Key.System;
        } //OnPreviewKeyDown

        protected override void OnPreviewMouseDown(MouseButtonEventArgs e) {
            Focus();
            var position = e.GetPosition((Canvas)this.Parent);
            if (DragStarted != null)
                DragStarted.Invoke(this, new MotionEventArgs(MoveSource.Drag, this.Index, position));
            CaptureMouse();
        } //OnPreviewMouseDown
        protected override void OnPreviewMouseMove(MouseEventArgs e) {
            if (!this.IsMouseCaptured) return;
            var position = e.GetPosition((Canvas)this.Parent);
            if (Moved != null)
                Moved.Invoke(this, new MotionEventArgs(MoveSource.Drag, this.Index, position));
        } //OnPreviewMouseMove

        protected Point locatiobAtDragStart, mouseLocationAtDragStart;
        internal void DragStartHandler(MotionEventArgs e) {
            locatiobAtDragStart = this.Location;
            mouseLocationAtDragStart = e.Position;
        } //DragStartHandler

        internal Point Location {
            get { return new Point(Canvas.GetLeft(this) + this.Width / 2, Canvas.GetTop(this) + this.Height / 2); }
            set {
                Canvas.SetLeft(this, value.X - this.Width / 2); Canvas.SetTop(this, value.Y - this.Height / 2);
                if (LocationChanged != null) LocationChanged.Invoke(this, new EventArgs());
            } //set Location
        } //Location

        internal int Index { get; set; }

        internal event EventHandler LocationChanged;
        internal event System.EventHandler<MotionEventArgs> Moved;
        internal event System.EventHandler<MotionEventArgs> DragStarted;

    } //BaseGrip

} //namespace AnamorphicDrawing.Ui

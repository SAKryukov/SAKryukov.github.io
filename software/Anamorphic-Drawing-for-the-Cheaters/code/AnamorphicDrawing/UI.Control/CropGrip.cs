namespace AnamorphicDrawing.Ui {
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Input;

    internal partial class CropGrip : BaseGrip {

        protected override void OnMouseDown(System.Windows.Input.MouseButtonEventArgs e) {
            Focus();
        } //OnMouseDown

        protected override bool IsGoodMotionKey(KeyEventArgs e) {
            if (this.Direction == GripDirection.Horizontal) {
                if (e.Key == Key.System) {
                    return e.SystemKey == Key.Left || e.SystemKey == Key.Right;
                } else {
                    return e.Key == Key.Down || e.Key == Key.Left || e.Key == Key.Right;
                } // if System
            } else {
                if (e.Key == Key.System) {
                    return e.SystemKey == Key.Up || e.SystemKey == Key.Down;
                } else {
                    return e.Key == Key.Up || e.Key == Key.Down;
                } // if System
            } //if Direction
        } //IsGoodMotionKey

    } //CropGrip

} //namespace AnamorphicDrawing.Ui

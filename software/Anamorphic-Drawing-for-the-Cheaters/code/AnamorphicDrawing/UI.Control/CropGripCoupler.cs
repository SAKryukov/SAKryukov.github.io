namespace AnamorphicDrawing.Ui {
    using System.Windows;
    using System.Windows.Controls;

    class CropGripCoupler {

        internal CropGripCoupler(Image image, CropGrip[] cropGripSet, Border cropBorder, double frameThickness) {
            Thickness cropBorderThicknessAtDragStart = default(Thickness);
            Point mouseAtDragStart = default(Point);
            for (int index = 0; index < cropGripSet.Length; ++index) {
                CropGrip grip = cropGripSet[index];
                grip.Index = index;
                grip.Moved += (sender, eventArgs) => {
                    CropGrip aGrip = cropGripSet[eventArgs.Index];
                    double position;
                    double newThickness = double.NaN;
                    if (eventArgs.Source == BaseGrip.MoveSource.Drag) {
                        if (aGrip.Direction == CropGrip.GripDirection.Horizontal) {
                            position = eventArgs.Position.X - mouseAtDragStart.X;
                            if (aGrip.IsHighValueRole)
                                newThickness = cropBorderThicknessAtDragStart.Right - position;
                            else
                                newThickness = cropBorderThicknessAtDragStart.Left + position;
                        } else {
                            position = eventArgs.Position.Y - mouseAtDragStart.Y;
                            if (aGrip.IsHighValueRole)
                                newThickness = cropBorderThicknessAtDragStart.Bottom - position;
                            else
                                newThickness = cropBorderThicknessAtDragStart.Top + position;
                        } //if Direction
                    } else {
                        if (aGrip.Direction == CropGrip.GripDirection.Horizontal) position = eventArgs.Position.X;
                        else position = eventArgs.Position.Y;
                    } //if
                    MoveCropBorder(aGrip, position, newThickness);
                }; //grip.Moved
                grip.DragStarted += (sender, eventArgs) => {
                    mouseAtDragStart = eventArgs.Position;
                    cropBorderThicknessAtDragStart = cropBorder.BorderThickness;
                }; //grip.DragStarted
            } //loop
            this.image = image;
            this.cropGripSet = cropGripSet;
            this.cropBorder = cropBorder;
            this.canvas = (Canvas)image.Parent;
            this.frameThickness = frameThickness;
        } //CropGripCoupler

        void MoveCropBorder(CropGrip grip, double position, double newThickness) {
            double minSize = frameThickness;
            double delta = position;
            double left = cropBorder.BorderThickness.Left;
            double right = cropBorder.BorderThickness.Right;
            double top = cropBorder.BorderThickness.Top;
            double bottom = cropBorder.BorderThickness.Bottom;
            double minLeft = cropBorderMinimalThickness.Left;
            double minRight = cropBorderMinimalThickness.Right;
            double minTop = cropBorderMinimalThickness.Top;
            double minBottom = cropBorderMinimalThickness.Bottom;
            if (grip.Direction == CropGrip.GripDirection.Horizontal)
                if (grip.IsHighValueRole) {
                    if (double.IsNaN(newThickness))
                        right -= delta;
                    else
                        right = newThickness;
                    if (right < minRight) right = minRight;
                    double newWidth = cropBorder.ActualWidth - left - right;
                    if (newWidth < minSize)
                        right = cropBorder.ActualWidth - left - minSize;
                } else {
                    if (double.IsNaN(newThickness))
                        left += delta;
                    else
                        left = newThickness;
                    if (left < minLeft) left = minLeft;
                    double newWidth = cropBorder.ActualWidth - left - right;
                    if (newWidth < minSize)
                        left = cropBorder.ActualWidth - right - minSize;
                } //if high
            else
                if (grip.IsHighValueRole) {
                    if (double.IsNaN(newThickness))
                        bottom -= delta;
                    else
                        bottom = newThickness;
                    if (bottom < minBottom) bottom = minBottom;
                    double newHeight = cropBorder.ActualHeight - top - bottom;
                    if (newHeight < minSize)
                        bottom = cropBorder.ActualHeight - top - minSize;
                } else {
                    if (double.IsNaN(newThickness))
                        top += delta;
                    else
                        top = newThickness;
                    if (top < minTop) top = minTop;
                    double newHeight = cropBorder.ActualHeight - top - bottom;
                    if (newHeight < minSize)
                        top = cropBorder.ActualHeight - bottom - minSize;
                } //if hight
            cropBorder.BorderThickness = new Thickness(left, top, right, bottom);
            FollowCropBorder();
        } //MoveCropBorder

        Thickness cropBorderMinimalThickness = default(Thickness);
        internal void Arrange() {
            Canvas.SetTop(cropBorder, -this.frameThickness);
            Canvas.SetLeft(cropBorder, -this.frameThickness);
            cropBorder.Width = canvas.ActualWidth + this.frameThickness * 2;
            cropBorder.Height = canvas.ActualHeight + this.frameThickness * 2;
            double deltaX = this.frameThickness + (canvas.ActualWidth - image.Width) / 2;
            double deltaY = this.frameThickness + (canvas.ActualHeight - image.Height) / 2;
            if (deltaX < 0) deltaX = 0;
            if (deltaY < 0) deltaY = 0;
            cropBorder.BorderThickness = new Thickness(deltaX, deltaY, deltaX, deltaY);
            cropBorderMinimalThickness = cropBorder.BorderThickness;
            FollowCropBorder();
        } //Arrange

        void FollowCropBorder() {
            foreach (CropGrip grip in cropGripSet) {
                if (grip.Direction == CropGrip.GripDirection.Horizontal) {
                    if (grip.IsHighValueRole)
                        Canvas.SetLeft(grip, canvas.ActualWidth - cropBorder.BorderThickness.Right + grip.ActualWidth);
                    else
                        Canvas.SetLeft(grip, cropBorder.BorderThickness.Left - 2 * grip.ActualWidth);
                    Canvas.SetTop(grip, cropBorder.BorderThickness.Top - 2 * grip.ActualWidth);
                    var height = canvas.ActualHeight - cropBorder.BorderThickness.Top - cropBorder.BorderThickness.Bottom + 4 * grip.ActualWidth;
                    if (height < 0) height = 0;
                    grip.Height = height;
                } else {
                    if (grip.IsHighValueRole)
                        Canvas.SetTop(grip, canvas.ActualHeight - cropBorder.BorderThickness.Bottom + grip.ActualHeight);
                    else
                        Canvas.SetTop(grip, cropBorder.BorderThickness.Top - 2 * grip.ActualHeight);
                    Canvas.SetLeft(grip, cropBorder.BorderThickness.Left - 2 * grip.ActualHeight);
                    var width = canvas.ActualWidth - cropBorder.BorderThickness.Left - cropBorder.BorderThickness.Right + 4 * grip.ActualHeight;
                    if (width < 0) width = 0;
                    grip.Width = width;
                } //if
            } //loop
        } //FollowCropBorder

        Image image;
        CropGrip[] cropGripSet;
        Border cropBorder;
        Canvas canvas;
        double frameThickness;

    } //class CropGripCoupler

} //namespace AnamorphicDrawing.Ui

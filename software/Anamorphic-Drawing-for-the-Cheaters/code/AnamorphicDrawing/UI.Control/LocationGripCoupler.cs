namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Shapes;

    class LocationGripCoupler {

        internal LocationGripCoupler(Image image, LocationGrip[] gripSet, Polyline pad, Polyline mark) {
            this.gripSet = gripSet;
            this.pad = pad;
            this.mark = mark;
            canvas = (Canvas)mark.Parent;
            for (int index = 0; index <= gripSet.Length; ++index) {
                pad.Points.Add(new Point());
                mark.Points.Add(new Point());
            } //loop
            for (int index = 0; index < gripSet.Length; ++index) {
                LocationGrip instance = gripSet[index];
                instance.Index = index;
                instance.OnSelectedExclusively += (sender, eventArgs) => {
                    foreach (LocationGrip anotherInstance in gripSet)
                        if (anotherInstance != instance)
                            anotherInstance.IsSelected = false;
                }; //instance.OnSelectedExclusively
                instance.Moved += (sender, eventArgs) => {
                    for (int gripIndex = 0; gripIndex < gripSet.Length; ++gripIndex) {
                        LocationGrip grip = gripSet[gripIndex];
                        if (!grip.IsSelected) continue;
                        grip.MotionHandler(eventArgs);
                        Point newLocation = grip.Location;
                        FollowGrip(gripIndex);
                    } //loop
                    AdjustLastSegment();
                }; //instance.Moved
                instance.DragStarted += (sender, eventArgs) => {
                    foreach (LocationGrip grip in gripSet)
                        if (grip.IsSelected)
                            grip.DragStartHandler(eventArgs);
                }; //instance.DragStarted
            } //loop
            image.MouseDown += (sender, eventArgs) => {
                var point = eventArgs.GetPosition(canvas);
                int focused = Array.FindIndex<LocationGrip>(this.gripSet, aGrip => aGrip.IsFocused);
                if (focused < 0) return;
                gripSet[focused].Location = point;
                FollowGrip();
                int next = ++focused;
                if (next >= gripSet.Length) next = 0;
                gripSet[next].Focus();
            }; //image.MouseDown
        } //LocationGripCoupler

        void AdjustLastSegment() {
            mark.Points[mark.Points.Count - 1] = pad.Points[0];
            pad.Points[mark.Points.Count - 1] = pad.Points[0];
        } //AdjustLastSegment
        void FollowGrip(int index) {
            Point location = gripSet[index].Location;
            mark.Points[index] = location;
            pad.Points[index] = location;
        } //FollowGrip
        void FollowGrip() {
            for (int index = 0; index < gripSet.Length; ++index)
                FollowGrip(index);
            AdjustLastSegment();
        } //FollowGrip

        internal void Arrange(Point origin, Size size) {
            gripSet[0].Location = origin;
            gripSet[1].Location = new Point(size.Width - origin.X, origin.Y);
            gripSet[2].Location = new Point(size.Width - origin.X, size.Height - origin.Y);
            gripSet[3].Location = new Point(origin.X, size.Height - origin.Y);
            FollowGrip();
        } //Arrange

        LocationGrip[] gripSet;
        Polyline pad, mark;
        Canvas canvas;

    } //class LocationGripCoupler

} //namespace AnamorphicDrawing.Ui

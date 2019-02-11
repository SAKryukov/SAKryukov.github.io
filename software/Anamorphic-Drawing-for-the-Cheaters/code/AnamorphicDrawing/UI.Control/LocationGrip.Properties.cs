namespace AnamorphicDrawing.Ui {
    using System.Windows;

    partial class LocationGrip {

        static FrameworkPropertyMetadata SelectedPropertyMetadata = new FrameworkPropertyMetadata(false);

        static DependencyProperty SelectedProperty =
            DependencyProperty.Register("IsSelected", typeof(bool), typeof(LocationGrip), SelectedPropertyMetadata);
        
        public bool IsSelected {
            get { return (bool)GetValue(SelectedProperty); }
            set { SetValue(SelectedProperty, value); }
        } //IsSelected

    } //class LocationGrip

} //namespace AnamorphicDrawing.Ui

namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;

    partial class CropGrip {

        enum GripRoleValue : byte {
            HighValueMask = 0x0f,
            OrientationMask = 0xf0,
            HighValue = 1,
            Vertical = 0x10,
            Horizontal = 0x20,
        } //GripRoleValue

        internal enum GripRole : byte {
            Left = GripRoleValue.Horizontal,
            Right = GripRoleValue.Horizontal | GripRoleValue.HighValue,
            Top = GripRoleValue.Vertical,
            Bottom = GripRoleValue.Vertical | GripRoleValue.HighValue
        } //enum GripRole

        internal enum GripDirection : byte { Horizontal = GripRoleValue.Horizontal, Vertical = GripRoleValue.Vertical, }

        static FrameworkPropertyMetadata RolePropertyMetadata = new FrameworkPropertyMetadata();

        static DependencyProperty RoleProperty =
            DependencyProperty.Register("Role", typeof(GripRole), typeof(CropGrip), RolePropertyMetadata);

        internal GripRole Role {
            get { return (GripRole)GetValue(RoleProperty); }
            set { SetValue(RoleProperty, value); }
        } //Role

        internal bool IsHighValueRole { get { return ((byte)Role & (byte)GripRoleValue.HighValueMask) > 0; } }
        internal GripDirection Direction { get { return (GripDirection)((byte)Role & (byte)GripRoleValue.OrientationMask); } }

    } //CropGrip

} //namespace AnamorphicDrawing.Ui

namespace AnamorphicDrawing.Ui {
    using System.Windows;

    partial class About : Window {

        internal About() {
            InitializeComponent();
            Main.AnamorphicDrawingApplication application = Main.AnamorphicDrawingApplication.Current;
            Title = string.Format(AnamorphicDrawing.Resources.Application.TitleFormatAbout, application.ProductName);
            var version = application.AssemblyVersion;
            this.textBlockProduct.Text = string.Format(AnamorphicDrawing.Resources.Application.VersionFormat, application.ProductName, version.Major, version.Minor);
            this.texBlockCopyright.Text = Main.AnamorphicDrawingApplication.Current.Copyright;
            this.buttonOk.Click += (sender, eventArgs) => { Hide(); };
            buttonOk.Focus();
        } //About
        
    } //class About

} //namespace AnamorphicDrawing.Ui

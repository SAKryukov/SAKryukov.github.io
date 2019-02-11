namespace AnamorphicDrawing.Main {
    using System;
    using System.Windows;
    using System.Reflection;
    using StringList = System.Collections.Generic.List<string>;
    using IStringList = System.Collections.Generic.IList<string>;
    using StringBuilder = System.Text.StringBuilder;

    class AnamorphicDrawingApplication : Application {

        internal AnamorphicDrawingApplication() {
            DispatcherUnhandledException += (sender, eventArgs) => {
                ShowException(eventArgs.Exception);
                eventArgs.Handled = true;
            }; //DispatcherUnhandledException
        } //AnamorphicDrawingApplication

        protected override void OnStartup(StartupEventArgs e) {
            this.ShutdownMode = ShutdownMode.OnMainWindowClose;
            MainWindow = new Ui.MainWindow();
            MainWindow.Title = string.Format(AnamorphicDrawing.Resources.Application.TitleFormatMain, ProductName);
            MainWindow.Show();
            startupComplete = true;
        } //OnStartup

        void ShowException(Exception e) {
            Func<Exception, string> exceptionTextFinder = (ex) => {
                Action<Exception, IStringList> exceptionTextCollector = null; // for recursiveness
                exceptionTextCollector = (exc, aList) => {
                    aList.Add(string.Format(AnamorphicDrawing.Resources.Exceptions.ExceptionFormat, exc.GetType().FullName, exc.Message));
                    if (exc.InnerException != null)
                        exceptionTextCollector(exc.InnerException, aList);
                }; //exceptionTextCollector
                IStringList list = new StringList();
                exceptionTextCollector(ex, list);
                StringBuilder sb = new StringBuilder();
                bool first = true;
                foreach (string item in list)
                    if (first) {
                        sb.Append(item);
                        first = false;
                    } else
                        sb.Append(AnamorphicDrawing.Resources.Exceptions.ExceptionStackItemDemiliter + item);
                return sb.ToString();
            }; //exceptionTextFinder
            MessageBox.Show(
                exceptionTextFinder(e),
                ProductName,
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            if (!startupComplete)
                Shutdown();
        } //ShowException

        [STAThread]
        static void Main(string[] args) {
            Application app = new AnamorphicDrawingApplication();
            app.Run();
        } //Main

        internal string ProductName {
            get {
                if (productName == null) {
                    object[] attributes = TheAssembly.GetCustomAttributes(typeof(AssemblyProductAttribute), false);
                    if (attributes == null) return null;
                    if (attributes.Length < 1) return null;
                    productName = ((AssemblyProductAttribute)attributes[0]).Product;
                } //if
                return productName;
            } //get ProductName
        } //ProductName
        internal string Copyright {
            get {
                if (copyright == null) {
                    object[] attributes = TheAssembly.GetCustomAttributes(typeof(AssemblyCopyrightAttribute), false);
                    if (attributes == null) return null;
                    if (attributes.Length < 1) return null;
                    copyright = ((AssemblyCopyrightAttribute)attributes[0]).Copyright;
                } //if
                return copyright;
            } //get Copyright
        } //Copyright
        internal Version AssemblyVersion {
            get {
                if (assemblyVersion == null) {
                    object[] attributes = TheAssembly.GetCustomAttributes(typeof(AssemblyFileVersionAttribute), false);
                    if (attributes == null) return null;
                    if (attributes.Length < 1) return null;
                    assemblyVersion = new Version(((AssemblyFileVersionAttribute)attributes[0]).Version);
                } //if
                return assemblyVersion;
            } //get AssemblyVersion
        } //AssemblyVersion
        internal Version AssemblyInformationalVersion {
            get {
                if (assemblyVersion == null) {
                    object[] attributes = TheAssembly.GetCustomAttributes(typeof(AssemblyInformationalVersionAttribute), false);
                    if (attributes == null) return null;
                    if (attributes.Length < 1) return null;
                    assemblyVersion = new Version(((AssemblyInformationalVersionAttribute)attributes[0]).InformationalVersion);
                } //if
                return assemblyVersion;
            } //get AssemblyVersion
        } //AssemblyVersion

        Assembly TheAssembly {
            get {
                if (assembly == null)
                    assembly = Assembly.GetEntryAssembly();
                return assembly;
            } //get TheAssembly
        } //TheAssembly

        internal static new AnamorphicDrawingApplication Current { get { return (AnamorphicDrawingApplication)Application.Current; } }

        bool startupComplete;
        Assembly assembly;
        string productName, copyright;
        Version assemblyVersion;

    } //class AnamorphicDrawingApplication

} //namespace AnamorphicDrawing.Main

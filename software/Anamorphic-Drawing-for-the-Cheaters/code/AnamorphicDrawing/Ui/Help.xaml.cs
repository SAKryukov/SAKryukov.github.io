namespace AnamorphicDrawing.Ui {
    using System;
    using System.Windows;
    using System.IO;
    using System.Reflection;
    
    partial class Help : Window {

        internal class HelpException : System.ApplicationException {
            internal HelpException(string filePattern, string directory) :
                base(string.Format(AnamorphicDrawing.Resources.Exceptions.HelpExceptionFileNotFound, filePattern, directory)) { }
            internal HelpException(string filePattern, string directory, int filesFound) :
                base(string.Format(AnamorphicDrawing.Resources.Exceptions.HelpExceptionTooManyFilesNotFound, filePattern, directory, filesFound)) { }
        } //class HelpException
        
        internal Help() {
            InitializeComponent();
            string productName = Main.AnamorphicDrawingApplication.Current.ProductName;
            Title = string.Format(AnamorphicDrawing.Resources.Application.TitleFormatHelp, productName);
            Action updateStatus = () => {
                buttonBack.IsEnabled = browser.CanGoBack;
                buttonForward.IsEnabled = browser.CanGoForward;
                buttonHome.IsEnabled = browser.Source != null;
            }; //updateStatus
            string path = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
            string filePattern = AnamorphicDrawing.Resources.Application.HelpFilePattern;
            string[] files = Directory.GetFiles(path, filePattern, SearchOption.AllDirectories);
            if (files.Length < 1)
                throw new HelpException(filePattern, path);
            else if (files.Length != 1)
                throw new HelpException(filePattern, path, files.Length);
            helpFile = files[0];
            buttonHome.Click += (sender, eventArgs) => {
                browser.Navigate(new Uri(helpFile, UriKind.RelativeOrAbsolute));
            }; //buttonHome.Click
            buttonBack.Click += (sender, eventArgs) => {
                if (browser.CanGoBack)
                    browser.GoBack();
                updateStatus();
            }; //buttonBack.Click
            browser.LoadCompleted += (sender, eventArgs) => {
                this.status.Content = AnamorphicDrawing.Resources.Application.HelpStatusLoaded;
                if (browser.Source != null && browser.Source.Scheme != System.Uri.UriSchemeFile)
                    this.Uri.Text = browser.Source.ToString();
                else
                    this.Uri.Text = productName;
                updateStatus();
            }; //browser.LoadCompleted
            buttonForward.Click += (sender, eventArgs) => {
                if (browser.CanGoForward)
                    browser.GoForward();
                updateStatus();
            }; //buttonForward.Click
            browser.Navigating += (sender, eventArgs) => {
                this.status.Content = AnamorphicDrawing.Resources.Application.HelpStatusLoading;
                updateStatus();
            }; //browser.Navigating
            browser.Focus();
        } //Help

        internal string WizardStep {
            set {
                UriBuilder ub = new UriBuilder(helpFile);
                ub.Fragment = value;
                browser.Navigate(ub.Uri);
            } //set WizardStep
        } //WizardStep

        string helpFile;

    } //namespace AnamorphicDrawing.Ui

} //namespace AnamorphicDrawing.Ui

namespace AnamorphicDrawing.Ui {
    using System.Windows;
    using System.Windows.Input;
    using System.Windows.Media.Imaging;

    public partial class MainWindow : Window {

        static class DefinitionSet {
            internal const string openDialogFilter = "Image files|*.tif;*.tiff;*.jpg;*.jpeg;*.png;*.bmp;*.gif";
            internal const string saveDialogFilter = "PNG files|*.png";
            internal const string openDialogTitle = " Open Source Image";
            internal const string saveDialogTitle = " Save Anamorphic Image";
        } //class DefinitionSet

        public MainWindow() {
            InitializeComponent();
            OpenDialog.Title = DefinitionSet.openDialogTitle;
            SaveDialog.Title = DefinitionSet.saveDialogTitle;
            OpenDialog.Filter = DefinitionSet.openDialogFilter;
            SaveDialog.Filter = DefinitionSet.saveDialogFilter;
            pages = new Collaboration.ICollaborationProvider[] { this.stepFirst, this.stepCrop, this.stepFinish };
            finalPage = this.stepFinish;
            foreach (var page in pages)
                page.Collaboration.StatusChanged += (sender, eventArgs) => {
                    if ((eventArgs.Aspect & Collaboration.StatusChangeAspect.SelectonChange) > 0 && eventArgs.SelectionInfo != null)
                        this.selectionInfo.Content = eventArgs.SelectionInfo;
                    if ((eventArgs.Aspect & Collaboration.StatusChangeAspect.StatusLineMessageChange) > 0 && eventArgs.StatusMessage != null)
                        this.statusMessage.Content = eventArgs.StatusMessage;
                }; //page.Collaboration.StatusChanged
            miHelpAbout.Click += (sender, eventArgs) => {
                if (about == null) {
                    about = new About();
                    about.Owner = this;
                    about.Closing += (aboutSender, aboutEventArgs) => {
                        aboutEventArgs.Cancel = true;
                        about.Hide();
                    }; //about.Closing
                } //if
                about.ShowDialog();
            }; //miHelpAbout.Click
            this.miQuit.Click += (sender, eventArgs) => { Close(); };
            this.CommandBindings.Add(new CommandBinding(ApplicationCommands.Open, new ExecutedRoutedEventHandler((sender, eventArgs) => {
                if (isDirty && !ClosingOpeningHandler(true)) return;
                if (OpenDialog.ShowDialog() != true) return;
                pages[currentPageIndex].Collaboration.BitmapSource = new BitmapImage(new System.Uri(OpenDialog.FileName, System.UriKind.RelativeOrAbsolute));
                SetApplicationTitle(OpenDialog.FileName);
            }), new CanExecuteRoutedEventHandler((sender, eventArgs) => {
                eventArgs.CanExecute = currentPageIndex == 0;
            }))); //Open
            this.CommandBindings.Add(new CommandBinding(ApplicationCommands.Save, new ExecutedRoutedEventHandler((sender, eventArgs) => {
                Save();
            }), new CanExecuteRoutedEventHandler((sender, eventArgs) => {
                eventArgs.CanExecute = currentPageIndex > 0;
            }))); //Save
            this.CommandBindings.Add(new CommandBinding(ApplicationCommands.Help, new ExecutedRoutedEventHandler((sender, eventArgs) => {
                if (help == null) {
                    help = new Help();
                    help.ShowActivated = true;
                    help.Closing += (helpSender, helpEventArgs) => {
                        helpEventArgs.Cancel = true;
                        help.Hide();
                    }; //help.Closing
                } //if
                help.WizardStep = pages[currentPageIndex].Collaboration.WizardStep;
                help.Show(); help.Activate();
            }))); //Help
            this.CommandBindings.Add(new CommandBinding(ApplicationCommands.Print, new ExecutedRoutedEventHandler((sender, eventArgs) => {
                Main.ImageProcessingUtility.PrintImage(pages[currentPageIndex].Collaboration.BitmapSource);
            }), new CanExecuteRoutedEventHandler((sender, eventArgs) => {
                eventArgs.CanExecute = currentPageIndex > 0;
            }))); //Print
            this.CommandBindings.Add(new CommandBinding(ApplicationCommands.Undo, new ExecutedRoutedEventHandler((sender, eventArgs) => {
                pages[currentPageIndex].Collaboration.Visibility = System.Windows.Visibility.Hidden;
                currentPageIndex--;
                pages[currentPageIndex].Collaboration.Visibility = System.Windows.Visibility.Visible;
            }), new CanExecuteRoutedEventHandler((sender, eventArgs) => {
                eventArgs.CanExecute = currentPageIndex != 0;
            }))); //Undo
            this.CommandBindings.Add(new CommandBinding(ApplicationCommands.Redo, new ExecutedRoutedEventHandler((sender, eventArgs) => {
                BitmapSource transformedBitmap = pages[currentPageIndex].Collaboration.Transform();
                if (transformedBitmap == null) return;
                pages[currentPageIndex].Collaboration.Visibility = System.Windows.Visibility.Hidden;
                currentPageIndex++;
                if (currentPageIndex < pages.Length)
                    pages[currentPageIndex].Collaboration.BitmapSource = transformedBitmap;
                pages[currentPageIndex].Collaboration.Visibility = System.Windows.Visibility.Visible;
                if (pages[currentPageIndex] == finalPage)
                    isFinalStepDirty = true;
            }), new CanExecuteRoutedEventHandler((sender, eventArgs) => {
                eventArgs.CanExecute = (currentPageIndex < pages.Length - 1) && pages[currentPageIndex].Collaboration.IsReadyForNext;
            }))); //Redo
        } //MainWindow

        protected override void OnContentRendered(System.EventArgs e) {
            // to prevent status bar separator jerking back and forth:
            this.selectionInfo.Width = this.selectionInfo.ActualWidth;
            ProcessCommandLine();
        } //protected override void OnContentRendered(System.EventArgs e)

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e) {
            e.Cancel = !ClosingOpeningHandler(false);
        } //OnClosing

        void ProcessCommandLine() {
            var args = System.Environment.GetCommandLineArgs();
            if (args.Length < 2) return;
            string fileName = args[1];
            if (!System.IO.File.Exists(fileName)) return;
            pages[0].Collaboration.BitmapSource = new BitmapImage(new System.Uri(fileName, System.UriKind.RelativeOrAbsolute));
            SetApplicationTitle(fileName);
        } //ProcessCommandLine

        void SetApplicationTitle(string fileName) {
            Title = string.Format(
                AnamorphicDrawing.Resources.Application.TitleFormatMainWithFileName,
                System.IO.Path.GetFileName(fileName),
                Main.AnamorphicDrawingApplication.Current.ProductName);
        } //SetApplicationTitle

        bool Save(Collaboration.ICollaborationProvider page) {
            if (page.Collaboration.BitmapSource == null) return false;
            if (SaveDialog.ShowDialog() == true)
                Main.ImageProcessingUtility.SaveBitmap(page.Collaboration.BitmapSource, SaveDialog.FileName);
            else
                return false;
            if (page == finalPage) isFinalStepDirty = false;
            return true;
        } //Save
        bool Save() {
            return Save(pages[currentPageIndex]);
        } //Save

        bool ClosingOpeningHandler(bool isOpening) {
            if (isDirty) {
                MessageBoxButton buttons = MessageBoxButton.YesNoCancel;
                string question = AnamorphicDrawing.Resources.Application.WarningUnsavedWork;
                if (isOpening)
                     question = AnamorphicDrawing.Resources.Application.WarningUnsavedWorkOpen;
                string suggestion = AnamorphicDrawing.Resources.Application.RecommendationToSaveIntermediate;
                if (currentPageIndex == 1)
                    suggestion = AnamorphicDrawing.Resources.Application.RecommendationToSaveIntermediateCropStep;
                question += System.Environment.NewLine +
                    AnamorphicDrawing.Resources.Application.RecommendationToSave +
                    System.Environment.NewLine + System.Environment.NewLine + suggestion;
                var result = MessageBox.Show(
                    question,
                    string.Format(AnamorphicDrawing.Resources.Application.TitleFormatMain, Main.AnamorphicDrawingApplication.Current.ProductName),
                    buttons, MessageBoxImage.Question,
                    MessageBoxResult.Cancel);
                if (result == MessageBoxResult.Cancel) return false;
                if (result == MessageBoxResult.Yes)
                    if (!Save(finalPage)) return false;
            } //if
            return true;
        } //ClosingHandler

        Collaboration.ICollaborationProvider[] pages;
        Collaboration.ICollaborationProvider finalPage;
        int currentPageIndex = 0;

        bool isDirty { get { return isFinalStepDirty && this.finalPage.Collaboration.BitmapSource != null; } }
        bool isFinalStepDirty;
        Microsoft.Win32.OpenFileDialog OpenDialog = new Microsoft.Win32.OpenFileDialog();
        Microsoft.Win32.SaveFileDialog SaveDialog = new Microsoft.Win32.SaveFileDialog();
        About about;
        Help help;

    } //class MainWindow

} //namespace AnamorphicDrawing.Ui

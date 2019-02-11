::modify this path to use appropriate version of MSBuild:
set tool=%windir%\Microsoft.NET\Framework\v3.5\MSBuild.exe
set solution=AnamorphicDrawing.sln

::%tool% %solution% /p:Configuration=Debug
%tool% %solution% /p:Configuration=Release

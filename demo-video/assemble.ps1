# Assemble scene videos + narration — video length matches audio (recorded with padToDuration)
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScenesDir = Join-Path $Root "output\scenes"
$AudioDir = Join-Path $Root "output\audio"
$MergedDir = Join-Path $Root "output\merged"
$FinalDir = Join-Path $Root "output"
New-Item -ItemType Directory -Force -Path $MergedDir, $FinalDir | Out-Null

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: ffmpeg not found. Run: winget install Gyan.FFmpeg"
    exit 1
}

$config = Get-Content (Join-Path $Root "scenes.json") -Raw | ConvertFrom-Json
$concatList = Join-Path $MergedDir "concat.txt"
"" | Set-Content $concatList

foreach ($scene in $config.scenes) {
    $id = $scene.id
    $video = Join-Path $ScenesDir "$id.webm"
    $audio = Join-Path $AudioDir "$id.mp3"
    $merged = Join-Path $MergedDir "$id.mp4"

    if (-not (Test-Path $video) -or -not (Test-Path $audio)) {
        Write-Host "SKIP $id - missing video or audio"
        continue
    }

    Write-Host "Merging $id..."
    $audioDur = [double](& ffprobe -v quiet -show_entries format=duration -of csv=p=0 $audio)
    $filter = "[0:v]setpts=PTS-STARTPTS,fps=30,trim=duration=$audioDur,setpts=PTS-STARTPTS[v];[1:a]asetpts=PTS-STARTPTS[a]"

    $proc = Start-Process -FilePath "ffmpeg" -ArgumentList @(
        "-y", "-i", $video, "-i", $audio,
        "-filter_complex", $filter,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        $merged
    ) -Wait -PassThru -NoNewWindow -RedirectStandardError (Join-Path $MergedDir "$id-ffmpeg.log")

    if ((Test-Path $merged) -and ($proc.ExitCode -eq 0)) {
        Add-Content $concatList "file '$($merged.Replace('\','/'))'"
    }
}

$final = Join-Path $FinalDir "SumayaRestro_SpiceGarden_Demo.mp4"
Write-Host "Concatenating..."
$proc2 = Start-Process -FilePath "ffmpeg" -ArgumentList @(
    "-y", "-f", "concat", "-safe", "0", "-i", $concatList, "-c", "copy", $final
) -Wait -PassThru -NoNewWindow -RedirectStandardError (Join-Path $FinalDir "concat.log")

if (Test-Path $final) {
    $dur = & ffprobe -v quiet -show_entries format=duration -of csv=p=0 $final
    $size = [math]::Round((Get-Item $final).Length / 1MB, 1)
    Write-Host "SUCCESS: $final (${size} MB, $([math]::Round([double]$dur/60,1)) min)"
} else {
    Write-Host "ERROR: Final video not created"
    exit 1
}

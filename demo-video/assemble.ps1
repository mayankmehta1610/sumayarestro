# Assemble scene videos + narration into final demo MP4
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScenesDir = Join-Path $Root "output\scenes"
$AudioDir = Join-Path $Root "output\audio"
$MergedDir = Join-Path $Root "output\merged"
$FinalDir = Join-Path $Root "output"
New-Item -ItemType Directory -Force -Path $MergedDir, $FinalDir | Out-Null

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Host "ERROR: ffmpeg not found. Install from https://ffmpeg.org/download.html"
    Write-Host "  winget install Gyan.FFmpeg"
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

    if (-not (Test-Path $video)) {
        Write-Host "SKIP $id - no video"
        continue
    }
    if (-not (Test-Path $audio)) {
        Write-Host "SKIP $id - no audio"
        continue
    }

    Write-Host "Merging $id..."
    $audioDur = & ffprobe -v quiet -show_entries format=duration -of csv=p=0 $audio 2>$null
    $videoDur = & ffprobe -v quiet -show_entries format=duration -of csv=p=0 $video 2>$null
    $pad = [math]::Max(0, [double]$audioDur - [double]$videoDur + 0.5)
    $filter = if ($pad -gt 0.5) {
        "[0:v]setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=$pad[v];[1:a]asetpts=PTS-STARTPTS[a]"
    } else {
        "[0:v]setpts=PTS-STARTPTS,fps=30[v];[1:a]asetpts=PTS-STARTPTS[a]"
    }
    $proc = Start-Process -FilePath "ffmpeg" -ArgumentList @(
        "-y", "-i", $video, "-i", $audio,
        "-filter_complex", $filter,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        $merged
    ) -Wait -PassThru -NoNewWindow -RedirectStandardError (Join-Path $MergedDir "$id-ffmpeg.log")

    if ((Test-Path $merged) -and ($proc.ExitCode -eq 0)) {
        $line = "file '$($merged.Replace('\','/'))'"
        Add-Content $concatList $line
    } else {
        Write-Host "  WARN: merge failed for $id (exit $($proc.ExitCode))"
    }
}

$final = Join-Path $FinalDir "SumayaRestro_SpiceGarden_Demo.mp4"
Write-Host "Concatenating final video..."
$proc2 = Start-Process -FilePath "ffmpeg" -ArgumentList @(
    "-y", "-f", "concat", "-safe", "0", "-i", $concatList, "-c", "copy", $final
) -Wait -PassThru -NoNewWindow -RedirectStandardError (Join-Path $FinalDir "concat.log")

if (Test-Path $final) {
    $size = [math]::Round((Get-Item $final).Length / 1MB, 1)
    Write-Host ""
    Write-Host "SUCCESS: $final ($size MB)"
} else {
    Write-Host "ERROR: Final video not created"
    exit 1
}

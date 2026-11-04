<#
.SYNOPSIS
    Kịch bản tự động khởi tạo 5 Thanh tiến trình Milestone nằm ngang trên GitHub
.DESCRIPTION
    Tự động tạo 5 Milestones và phân công các Issues cho 5 thành viên Nhóm 03 - NOVA Cinema.
.EXAMPLE
    .\scripts\setup-github-milestones.ps1
    .\scripts\setup-github-milestones.ps1 -Status completed
#>

param(
    [ValidateSet("completed", "in-progress", "open")]
    [string]$Status = "completed"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "🎬 NOVA CINEMA - KHỞI TẠO HỆ THỐNG GITHUB MILESTONES & PROGRESS TRACKER" -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan

# Kiểm tra Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Yêu cầu cài đặt Node.js để thực thi script."
}

# Chạy kịch bản Node.js
node scripts/setup-github-milestones.mjs "--status=$Status"

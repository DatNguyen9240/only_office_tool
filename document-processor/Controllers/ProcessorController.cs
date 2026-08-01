using System;
using System.IO;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Amazon.S3;
using Amazon.S3.Model;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using OfficeOpenXml;
using OfficeOpenXml.Drawing.Chart;
using DocumentProcessor.Models;

namespace DocumentProcessor.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProcessorController : ControllerBase
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    static ProcessorController()
    {
        // Set EPPlus License Context
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    public ProcessorController(IConfiguration configuration)
    {
        var s3Endpoint = Environment.GetEnvironmentVariable("S3_ENDPOINT") ?? "http://localhost:9000";
        var accessKey = Environment.GetEnvironmentVariable("S3_ACCESS_KEY") ?? "minioadmin";
        var secretKey = Environment.GetEnvironmentVariable("S3_SECRET_KEY") ?? "minioadmin";
        _bucketName = Environment.GetEnvironmentVariable("S3_BUCKET") ?? "meridian-dms";

        var s3Config = new AmazonS3Config
        {
            ServiceURL = s3Endpoint,
            ForcePathStyle = true // Required for MinIO
        };

        _s3Client = new AmazonS3Client(accessKey, secretKey, s3Config);
    }

    [HttpPost("merge-word")]
    public async Task<IActionResult> MergeWord([FromBody] MergeWordRequest request)
    {
        try
        {
            // 1. Download template from MinIO
            using var downloadResponse = await _s3Client.GetObjectAsync(_bucketName, request.TemplateObjectKey);
            using var templateStream = new MemoryStream();
            await downloadResponse.ResponseStream.CopyToAsync(templateStream);
            templateStream.Position = 0;

            // 2. Perform OpenXML merge
            using (var doc = WordprocessingDocument.Open(templateStream, true))
            {
                var body = doc.MainDocumentPart?.Document.Body;
                if (body != null)
                {
                    foreach (var text in body.Descendants<Text>())
                    {
                        foreach (var entry in request.Placeholders)
                        {
                            if (text.Text != null && text.Text.Contains(entry.Key))
                            {
                                text.Text = text.Text.Replace(entry.Key, entry.Value);
                            }
                        }
                    }
                    doc.MainDocumentPart.Document.Save();
                }
            }

            templateStream.Position = 0;

            // 3. Upload result back to MinIO
            var putRequest = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = request.OutputObjectKey,
                InputStream = templateStream,
                ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            };
            await _s3Client.PutObjectAsync(putRequest);

            return Ok(new { success = true, message = "Word document merged successfully", objectKey = request.OutputObjectKey });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("generate-excel")]
    public async Task<IActionResult> GenerateExcel([FromBody] GenerateExcelRequest request)
    {
        try
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Data Report");

            // Style Title
            worksheet.Cells["A1"].Value = request.Title;
            worksheet.Cells["A1"].Style.Font.Bold = true;
            worksheet.Cells["A1"].Style.Font.Size = 16;

            // Table Headers
            worksheet.Cells["A3"].Value = "Category";
            worksheet.Cells["B3"].Value = "Value";
            worksheet.Cells["A3:B3"].Style.Font.Bold = true;

            int row = 4;
            foreach (var item in request.Data)
            {
                worksheet.Cells[row, 1].Value = item.Category;
                worksheet.Cells[row, 2].Value = item.Value;
                row++;
            }

            // Total Row
            worksheet.Cells[row, 1].Value = "Total";
            worksheet.Cells[row, 1].Style.Font.Bold = true;
            worksheet.Cells[row, 2].Formula = $"=SUM(B4:B{row-1})";
            worksheet.Cells[row, 2].Style.Font.Bold = true;

            // Auto-fit columns
            worksheet.Cells[3, 1, row, 2].AutoFitColumns();

            // Add Column Chart
            var chart = worksheet.Drawings.AddChart("Chart", eChartType.ColumnClustered) as ExcelBarChart;
            if (chart != null)
            {
                chart.Title.Text = request.Title;
                chart.SetPosition(row + 2, 0, 0, 0);
                chart.SetSize(600, 400);
                chart.Series.Add(worksheet.Cells[4, 2, row - 1, 2], worksheet.Cells[4, 1, row - 1, 1]);
            }

            using var outputStream = new MemoryStream();
            await package.SaveAsAsync(outputStream);
            outputStream.Position = 0;

            // Upload to S3
            var putRequest = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = request.OutputObjectKey,
                InputStream = outputStream,
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            };
            await _s3Client.PutObjectAsync(putRequest);

            return Ok(new { success = true, message = "Excel report generated successfully", objectKey = request.OutputObjectKey });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("convert-pdf")]
    public async Task<IActionResult> ConvertPdf([FromBody] ConvertPdfRequest request)
    {
        string tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);

        string ext = Path.GetExtension(request.InputObjectKey).ToLower();
        string tempInputFile = Path.Combine(tempDir, $"input{ext}");
        string expectedOutputFile = Path.Combine(tempDir, "input.pdf");

        try
        {
            // 1. Download file from S3
            using var downloadResponse = await _s3Client.GetObjectAsync(_bucketName, request.InputObjectKey);
            using (var fileStream = System.IO.File.Create(tempInputFile))
            {
                await downloadResponse.ResponseStream.CopyToAsync(fileStream);
            }

            // 2. Convert to PDF using headless LibreOffice
            var startInfo = new ProcessStartInfo
            {
                FileName = "libreoffice",
                Arguments = $"--headless --convert-to pdf --outdir {tempDir} {tempInputFile}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (var process = Process.Start(startInfo))
            {
                if (process == null) throw new Exception("Failed to start LibreOffice process.");
                
                string stdout = await process.StandardOutput.ReadToEndAsync();
                string stderr = await process.StandardError.ReadToEndAsync();
                
                process.WaitForExit();

                if (process.ExitCode != 0)
                {
                    throw new Exception($"LibreOffice exited with code {process.ExitCode}. Error: {stderr}");
                }
            }

            if (!System.IO.File.Exists(expectedOutputFile))
            {
                throw new FileNotFoundException("LibreOffice output PDF file not found.");
            }

            // 3. Upload PDF back to S3
            using (var pdfStream = System.IO.File.OpenRead(expectedOutputFile))
            {
                var putRequest = new PutObjectRequest
                {
                    BucketName = _bucketName,
                    Key = request.OutputObjectKey,
                    InputStream = pdfStream,
                    ContentType = "application/pdf"
                };
                await _s3Client.PutObjectAsync(putRequest);
            }

            return Ok(new { success = true, message = "Converted to PDF successfully", objectKey = request.OutputObjectKey });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
        finally
        {
            try
            {
                Directory.Delete(tempDir, true);
            }
            catch { /* Ignore cleanup errors */ }
        }
    }
}

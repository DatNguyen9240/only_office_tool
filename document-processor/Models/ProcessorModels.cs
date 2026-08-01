using System.Collections.Generic;

namespace DocumentProcessor.Models;

public class MergeWordRequest
{
    public string TemplateObjectKey { get; set; } = string.Empty;
    public string OutputObjectKey { get; set; } = string.Empty;
    public Dictionary<string, string> Placeholders { get; set; } = new();
}

public class GenerateExcelRequest
{
    public string OutputObjectKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<ExcelRowData> Data { get; set; } = new();
}

public class ExcelRowData
{
    public string Category { get; set; } = string.Empty;
    public double Value { get; set; }
}

public class ConvertPdfRequest
{
    public string InputObjectKey { get; set; } = string.Empty;
    public string OutputObjectKey { get; set; } = string.Empty;
}

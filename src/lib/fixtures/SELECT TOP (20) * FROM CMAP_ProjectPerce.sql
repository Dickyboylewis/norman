SELECT TOP (20) * FROM CMAP_ProjectPercentageCompletes ORDER BY 1 DESC;

SELECT TOP (20) * FROM CMAP_ProjectValuesHistory ORDER BY 1 DESC;

SELECT COUNT(*) AS Rows, MIN(1) AS x FROM CMAP_ProjectPercentageCompletes;

SELECT COUNT(*) AS Rows FROM CMAP_ProjectValuesHistory;
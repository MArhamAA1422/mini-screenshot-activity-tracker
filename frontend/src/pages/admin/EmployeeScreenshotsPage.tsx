/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Screenshot {
  id: number;
  filePath: string;
  fileUrl: string;
  capturedAt: string;
}

interface ScreenshotGroup {
  hour: number;
  minuteBucket: number;
  timeRange: string;
  count: number;
  screenshots: Screenshot[];
}

interface GroupedData {
  employee: {
    id: number;
    name: string;
    screenshotInterval: number;
  };
  date: string;
  totalScreenshots: number;
  groups: ScreenshotGroup[];
}

export default function EmployeeScreenshotsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [data, setData] = useState<GroupedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<any>>(new Set());

  // Track image blob URLs and loading/error states
  const [imageBlobUrls, setImageBlobUrls] = useState<Map<number, string>>(
    new Map()
  );
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Map<number, boolean>
  >(new Map());
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchScreenshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, selectedDate]);

  useEffect(() => {
    return () => {
      // Revoke all blob URLs to free memory
      imageBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageBlobUrls]);

  const fetchScreenshots = async () => {
    setIsLoading(true);
    setError("");

    imageBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    setImageBlobUrls(new Map());
    setImageLoadingStates(new Map());
    setImageErrors(new Set());

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/admin/employees/${employeeId}/screenshots/grouped?date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load screenshots");
      }

      const result = await response.json();
      setData(result);

      const allGroups = new Set(
        result.groups.map((g: ScreenshotGroup) => `${g.hour}-${g.minuteBucket}`)
      );
      setExpandedGroups(allGroups);

      loadAllImages(result.groups);
    } catch (err: any) {
      setError(err.message || "Failed to load screenshots");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load all images by fetching them with authentication
   * and converting to blob URLs
   */
  const loadAllImages = async (groups: ScreenshotGroup[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const newBlobUrls = new Map<number, string>();
    const loadingStates = new Map<number, boolean>();
    const errors = new Set<number>();

    const allScreenshots: Screenshot[] = [];
    groups.forEach((group) => {
      allScreenshots.push(...group.screenshots);
    });

    const batchSize = 10;
    for (let i = 0; i < allScreenshots.length; i += batchSize) {
      const batch = allScreenshots.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (screenshot) => {
          loadingStates.set(screenshot.id, true);
          setImageLoadingStates(new Map(loadingStates));

          try {
            const response = await fetch(screenshot.fileUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            newBlobUrls.set(screenshot.id, blobUrl);
            loadingStates.set(screenshot.id, false);
          } catch (error) {
            console.error(`Failed to load screenshot ${screenshot.id}:`, error);
            errors.add(screenshot.id);
            loadingStates.set(screenshot.id, false);
          }

          setImageBlobUrls(new Map(newBlobUrls));
          setImageLoadingStates(new Map(loadingStates));
          setImageErrors(new Set(errors));
        })
      );
    }
  };

  const toggleGroup = (hour: number, minuteBucket: number) => {
    const key = `${hour}-${minuteBucket}`;
    const newExpanded = new Set(expandedGroups);

    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }

    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    if (!data) return;
    const allGroups = new Set(
      data.groups.map((g) => `${g.hour}-${g.minuteBucket}`)
    );
    setExpandedGroups(allGroups);
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const downloadImage = async (screenshot: Screenshot) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(screenshot.fileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screenshot_${format(
        new Date(screenshot.capturedAt),
        "yyyy-MM-dd_HH-mm-ss"
      )}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download screenshot");
    }
  };

  const openImageInNewTab = (screenshot: Screenshot) => {
    const blobUrl = imageBlobUrls.get(screenshot.id);
    if (blobUrl) {
      window.open(blobUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/employees")}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {data?.employee.name || "Employee"} - Screenshots
                </h1>
                <p className="text-sm text-gray-600">
                  Interval: {data?.employee.screenshotInterval || "-"} minutes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data && !isLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Viewing:{" "}
                <strong>
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </strong>
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.totalScreenshots} screenshot
                {data.totalScreenshots !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {imageBlobUrls.size} of {data.totalScreenshots} images loaded
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Collapse All
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">
                Error loading screenshots
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading screenshots...</p>
          </div>
        )}

        {!isLoading && data && data.groups.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No screenshots found
            </h3>
            <p className="text-gray-600">
              No screenshots uploaded on{" "}
              {format(new Date(selectedDate), "MMMM d, yyyy")}
            </p>
          </div>
        )}

        {!isLoading && data && data.groups.length > 0 && (
          <div className="space-y-4">
            {data.groups.map((group) => {
              const isExpanded = expandedGroups.has(
                `${group.hour}-${group.minuteBucket}`
              );

              return (
                <div
                  key={`${group.hour}-${group.minuteBucket}`}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleGroup(group.hour, group.minuteBucket)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}

                      <div className="text-left">
                        <div className="text-lg font-semibold text-gray-900">
                          {group.timeRange}
                        </div>
                        <div className="text-sm text-gray-600">
                          {group.count} screenshot{group.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      {format(
                        new Date(
                          selectedDate +
                            "T" +
                            String(group.hour).padStart(2, "0") +
                            ":" +
                            String(group.minuteBucket).padStart(2, "0")
                        ),
                        "h:mm a"
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {group.screenshots.map((screenshot) => {
                          const blobUrl = imageBlobUrls.get(screenshot.id);
                          const isLoading = imageLoadingStates.get(
                            screenshot.id
                          );
                          const hasError = imageErrors.has(screenshot.id);

                          return (
                            <div
                              key={screenshot.id}
                              className="group relative aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-300 hover:border-blue-500 transition"
                            >
                              {isLoading && !blobUrl && !hasError && (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                                  <p className="text-xs text-gray-500">
                                    Loading...
                                  </p>
                                </div>
                              )}

                              {hasError && (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                  <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                                  <p className="text-xs text-red-600 text-center">
                                    Failed to load
                                  </p>
                                  <p className="text-xs text-gray-500 text-center mt-1">
                                    {format(
                                      new Date(screenshot.capturedAt),
                                      "HH:mm:ss"
                                    )}
                                  </p>
                                </div>
                              )}

                              {blobUrl && !hasError && (
                                <>
                                  <img
                                    src={blobUrl}
                                    alt={`Screenshot at ${format(
                                      new Date(screenshot.capturedAt),
                                      "HH:mm:ss"
                                    )}`}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() =>
                                      openImageInNewTab(screenshot)
                                    }
                                  />

                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition flex items-center justify-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openImageInNewTab(screenshot);
                                      }}
                                      className="text-white opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/20 rounded-lg"
                                      title="Open in new tab"
                                    >
                                      <ImageIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadImage(screenshot);
                                      }}
                                      className="text-white opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/20 rounded-lg"
                                      title="Download"
                                    >
                                      <Download className="w-5 h-5" />
                                    </button>
                                  </div>

                                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    {format(
                                      new Date(screenshot.capturedAt),
                                      "HH:mm"
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

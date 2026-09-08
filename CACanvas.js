/**
 * CACanvas - A cellular automata canvas utility class
 * Manages a grid-based canvas with fixed rows/columns and responsive cell sizing
 *
 * @class CACanvas
 * @param {HTMLCanvasElement} canvas - The canvas element to manage
 * @param {Object} options - Configuration options
 * @param {number} options.cellSize - Initial cell size in pixels (default: 2)
 * @param {number} options.maxWidth - Maximum canvas width in pixels (default: null = no limit)
 * @param {number} options.maxHeight - Maximum canvas height in pixels (default: null = no limit)
 * @param {boolean} options.maintainAspectRatio - Whether to maintain aspect ratio (default: true)
 * @param {number} options.fixedRows - Fixed number of rows in the grid (default: 30)
 * @param {number} options.fixedCols - Fixed number of columns in the grid (default: 30)
 */
export default class CACanvas {
    constructor(canvas, options = {}) {
        // Store canvas reference and get 2D rendering context
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        // Default options merged with user provided options
        this.options = {
            cellSize: 2,               // Initial cell size in pixels
            maxWidth: null,            // Maximum width constraint (null = no limit)
            maxHeight: null,           // Maximum height constraint (null = no limit)
            maintainAspectRatio: true, // Keep the grid square/rectangular proportion
            fixedRows: 30,             // Fixed number of rows in the grid
            fixedCols: 30,             // Fixed number of columns in the grid
            ...options                 // Override defaults with user options
        };

        // Initialize properties
        this.cellSize = this.options.cellSize;     // Current cell size in pixels
        this.ofHeight = this.options.ofHeight;     // Height factor (for legacy compatibility)
        this.cols = this.options.fixedCols;        // Number of columns (fixed)
        this.rows = this.options.fixedRows;        // Number of rows (fixed)
        this.aspectRatio = null;                   // Current aspect ratio (cols/rows)

        // Bind the resize handler to this instance so it can be properly removed later
        this.handleResize = this.handleResize.bind(this);

        // Perform initial setup and sizing
        this.resizeAndReset();

        // Add event listener for window resize events
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Handle window resize events
     * Recalculates canvas size and cell dimensions
     */
    handleResize() {
        this.resizeAndReset();
    }

    /**
     * Resize the canvas and recalculate cell sizes
     * This is the main method that handles responsive sizing
     * - Gets container dimensions
     * - Applies constraints
     * - Calculates optimal cell size
     * - Resizes canvas to fit grid exactly
     */
    resizeAndReset() {
        // Get container dimensions - use container's client size, fallback to window size
        // clientWidth/clientHeight = usable space inside element (padding included, borders/scrollbars excluded)
        const container = this.canvas.parentElement || document.body;
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;

        // Start with container dimensions
        let width = containerWidth;
        let height = containerHeight;

        // Apply maximum size constraints if set by the user
        if (this.options.maxWidth) {
            width = Math.min(width, this.options.maxWidth);
        }
        if (this.options.maxHeight) {
            height = Math.min(height, this.options.maxHeight);
        }

        // Maintain aspect ratio if required (keeps the grid proportional)
        if (this.options.maintainAspectRatio && this.aspectRatio) {
            // Calculate dimensions that maintain the current aspect ratio
            const ratioWidth = height * this.aspectRatio;   // Width if constrained by height
            const ratioHeight = width / this.aspectRatio;   // Height if constrained by width

            // Choose the dimensions that fit within the available space
            if (ratioWidth <= width) {
                width = ratioWidth;      // Width is the limiting factor
            } else {
                height = ratioHeight;    // Height is the limiting factor
            }
        }

        // Calculate cell size based on fixed rows and columns
        // Each cell should be as large as possible while fitting all cells in the grid
        const cellSizeX = Math.floor(width / this.cols);   // Maximum cell size based on width
        const cellSizeY = Math.floor(height / this.rows);  // Maximum cell size based on height
        this.cellSize = Math.min(cellSizeX, cellSizeY);     // Use the smaller to fit both dimensions
        this.cellSize = Math.max(this.cellSize, 1);         // Ensure minimum cell size of 1 pixel

        // Update the aspect ratio based on current grid dimensions
        this.aspectRatio = this.cols / this.rows;

        // Set canvas size to exactly fit the grid
        // This ensures each cell is exactly this.cellSize pixels
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;

        // Clear the canvas with default background
        this.clear("#eeeeee");
    }

    /**
     * Change the grid dimensions and recalculate
     * @param {number} rows - New number of rows
     * @param {number} cols - New number of columns
     */
    setGrid(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.resizeAndReset(); // Recalculate cell sizes for new grid
    }

    /**
     * Set canvas to a specific size in pixels
     * The grid will be recalculated to fit within this size
     * @param {number} width - Desired canvas width in pixels
     * @param {number} height - Desired canvas height in pixels
     */
    setSize(width, height) {
        // Set canvas to specific size in pixels
        this.canvas.width = width;
        this.canvas.height = height;

        // Calculate cell size based on fixed rows and cols and the new canvas size
        const cellSizeX = Math.floor(width / this.cols);
        const cellSizeY = Math.floor(height / this.rows);
        this.cellSize = Math.min(cellSizeX, cellSizeY);
        this.cellSize = Math.max(this.cellSize, 1);

        // Adjust canvas to fit exact grid (may be slightly smaller than requested)
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;
        this.aspectRatio = this.cols / this.rows;

        // Clear the canvas
        this.clear("#eeeeee");
    }

    /**
     * Manually set the cell size and adjust canvas accordingly
     * @param {number} cellSize - New cell size in pixels
     */
    setCellSize(cellSize) {
        this.cellSize = Math.max(cellSize, 1);
        // Recalculate canvas size based on fixed rows and cols and new cell size
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;
        this.aspectRatio = this.cols / this.rows;
        this.clear("#eeeeee");
    }

    /**
     * Clear the entire canvas with a background color
     * @param {string} backGround - CSS color string (default: "#eeeeee")
     */
    clear(backGround = "#eeeeee") {
        this.ctx.fillStyle = backGround;
        this.ctx.fillRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );
    }

    /**
     * Draw a circle at the specified grid position
     * The circle is centered within the cell and fills it
     * @param {number} x - Grid column index (0-based)
     * @param {number} y - Grid row index (0-based)
     * @param {string} colour - CSS color string (default: "#333333")
     * @param {boolean} border - Whether to draw a border around the circle (default: false)
     */
    drawCircleAt(x, y, colour = "#333333", border = false) {
        // Calculate center position of the cell
        const centerX = x * this.cellSize + this.cellSize / 2;
        const centerY = y * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize / 2; // Circle fills the cell

        // Draw the circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = colour;
        this.ctx.fill();

        // Optional border
        if(border) {
            this.ctx.strokeStyle = '#eeeeee';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    /**
     * Draw a square at the specified grid position
     * The square fills the entire cell
     * @param {number} x - Grid column index (0-based)
     * @param {number} y - Grid row index (0-based)
     * @param {string} colour - CSS color string (default: "#333333")
     * @param {boolean} border - Whether to draw a border around the square (default: false)
     */
    drawSquareAt(x, y, colour = "#333333", border = false) {
        // Fill the cell with color
        this.ctx.fillStyle = colour;
        this.ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize,
            this.cellSize,
        );

        // Optional border
        if(border) {
            this.ctx.strokeStyle = '#eeeeee';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                x * this.cellSize,
                y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }

    /**
     * Draw an image at the specified grid position
     * The image is centered within the cell and scaled to 80% of cell size
     * @param {number} x - Grid column index (0-based)
     * @param {number} y - Grid row index (0-based)
     * @param {HTMLImageElement} img - The image element to draw
     */
    drawImageAt(x, y, img) {
        if (img) {
            // Scale image to 80% of cell size (leaves margin)
            const imgSize = this.cellSize * 0.8;
            // Calculate offset to center the image in the cell
            const offsetX = (this.cellSize - imgSize) / 2;
            const offsetY = (this.cellSize - imgSize) / 2;

            // Draw the image centered in the cell
            this.ctx.drawImage(
                img,
                x * this.cellSize + offsetX,
                y * this.cellSize + offsetY,
                imgSize,
                imgSize
            );
        }
    }

    /**
     * Clean up and remove event listeners
     * Call this when the canvas is no longer needed to prevent memory leaks
     */
    destroy() {
        // Remove the resize event listener
        window.removeEventListener('resize', this.handleResize);
    }
}

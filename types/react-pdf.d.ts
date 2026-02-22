declare module "react-pdf" {
  export interface DocumentProps {
    file: string | File | { data: Uint8Array };
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    className?: string;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    width?: number;
    height?: number;
    scale?: number;
    rotate?: number;
    renderTextLayer?: boolean;
    renderAnnotationLayer?: boolean;
    className?: string;
  }

  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;
  export const pdfjs: {
    version: string;
    GlobalWorkerOptions: {
      workerSrc: string;
    };
  };
}

declare module "react-pdf/dist/Page/AnnotationLayer.css";
declare module "react-pdf/dist/Page/TextLayer.css";

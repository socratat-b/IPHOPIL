import { Component, OnInit, signal, computed, ViewChild, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import JsBarcode from 'jsbarcode';
import { UserService } from '../../../core/services/user.service'; // Import UserService

interface Document {
  document_id: string;
  code: string;
  subject_title: string;
  category_name: string;
  type_name: string;
  message: string;
  account_name: string;
  received_date_received: string;
  office_name: string;
}

// If you need to extend Document for received documents
interface ReceivedDocument extends Document {
  document_code: string;
  office_id?: string;
  status?: string;
}

// Create a mapper to convert Document to ReceivedDocument
function mapToReceivedDocument(doc: Document): ReceivedDocument {
  return {
    ...doc,
    document_code: doc.code, // Map the code to document_code
  };
}



interface ReleaseDocumentInfo {
  code: string;
  receivingOffice: string;
  message: string;
}

@Component({
  selector: 'app-received',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QRCodeModule],
  templateUrl: './received.component.html',
  styleUrls: ['./received.component.css']
})
export class ReceivedComponent implements OnInit {
  @ViewChild('releaseDocumentModal') releaseDocumentModal!: ElementRef<HTMLDialogElement>;
  @ViewChildren('qrcodeContainer') qrcodeContainers!: QueryList<ElementRef>;
  @ViewChildren('barcodeContainer') barcodeContainers!: QueryList<ElementRef>;

  documents = signal<ReceivedDocument[]>([]);
  searchQuery = signal('');
  currentPage = signal(1);
  itemsPerPage = signal(5);

  showFilterModal = signal(false);
  types = signal<string[]>([]);
  offices = signal<string[]>([]);
  categories = signal<string[]>([]);

  selectedType = signal('All Types');
  selectedOffice = signal('All Offices');
  selectedCategory = signal('All Categories');
  
  
  filteredDocuments = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.documents().filter((doc) =>
      (doc.code?.toLowerCase().includes(query) ||
       doc.subject_title?.toLowerCase().includes(query) ||
       doc.category_name?.toLowerCase().includes(query) ||
       doc.type_name?.toLowerCase().includes(query) ||
       doc.message?.toLowerCase().includes(query) ||
       doc.account_name?.toLowerCase().includes(query) ||
       doc.received_date_received?.toLowerCase().includes(query)) &&
      (this.selectedType() === 'All Types' || doc.type_name === this.selectedType()) &&
      (this.selectedOffice() === 'All Offices' || doc.office_name === this.selectedOffice()) &&
      (this.selectedCategory() === 'All Categories' || doc.category_name === this.selectedCategory())
    );
  });

  paginatedDocuments = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredDocuments().slice(startIndex, startIndex + this.itemsPerPage());
  });

  releaseDocumentInfo = signal<ReleaseDocumentInfo>({ code: '', receivingOffice: '', message: '' });
  totalPages = computed(() => Math.ceil(this.filteredDocuments().length / this.itemsPerPage()));
  
  constructor(private router: Router, private userService: UserService) {}

  async ngOnInit(): Promise<void> {
    // Map the documents to ReceivedDocument type
    const docs = await this.userService.getReceivedDocuments();
    const receivedDocs = docs.map(mapToReceivedDocument);
    this.documents.set(receivedDocs);
  }

  // Removed loadDocuments and loadFilterOptions methods

  toggleFilterModal(): void {
    this.showFilterModal.set(!this.showFilterModal());
  }

  applyFilter(): void {
    this.currentPage.set(1);
    this.toggleFilterModal();
  }

  updateSelectedOffice(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedOffice.set(select.value);
  }

  updateSelectedCategory(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory.set(select.value);
  }

  updateSelectedType(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedType.set(select.value);
  }

  filterDocuments(): void {
    this.currentPage.set(1);
  }

  changePage(page: number | string): void {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.currentPage.set(pageNumber);
    }
  }

  markAsCompleted(documentId: string): void {
    // Placeholder logic for marking document as completed
    console.log('Marking document as completed. Document ID:', documentId);
  }

  markAsDone(documentId: string): void {
    this.documents.update(docs => docs.filter(doc => doc.document_id !== documentId));
  }
  
  releaseDocument(): void {
    this.releaseDocumentInfo.set({ code: '', receivingOffice: '', message: '' });
    this.releaseDocumentModal.nativeElement.close();
  }

  viewDetails(documentId: string): void {
    this.router.navigate(['/user/view-details', documentId]);
  }

  updateReleaseDocumentInfo(field: keyof ReleaseDocumentInfo, value: string): void {
    this.releaseDocumentInfo.update(current => ({ ...current, [field]: value }));
  }

  getPaginationArray(): (number | string)[] {
    const totalPages = this.totalPages();
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const currentPage = this.currentPage();
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages - 1, totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, 2, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }

  openReleaseModal(documentId: string): void {
    this.releaseDocumentInfo.set({ code: documentId, receivingOffice: '', message: '' });
    this.releaseDocumentModal.nativeElement.showModal();
  }

  scanQRCode(): void {
    console.log('Scanning QR Code');
  }

  printQRCode(doc: ReceivedDocument): void {
    const qrCodeContainer = this.qrcodeContainers.find(container => container.nativeElement.getAttribute('data-doc-code') === doc.document_code);
    if (qrCodeContainer) {
      const qrCodeCanvas = qrCodeContainer.nativeElement.querySelector('canvas');
      if (qrCodeCanvas) {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
          const qrCodeDataUrl = qrCodeCanvas.toDataURL();
          printWindow.document.open();
          printWindow.document.write(`
            <html>
              <head>
                <title>Print QR Code</title>
                <style>
                  body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                  img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                  }
                </style>
              </head>
              <body>
                <img src="${qrCodeDataUrl}" />
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      }
    }
  }

  generateAndPrintBarcode(doc: ReceivedDocument): void {
    console.log("Generate and Print Barcode:", doc);
    const barcodeContainer = this.barcodeContainers.find(container => container.nativeElement.getAttribute('data-doc-code') === doc.document_code);
    if (barcodeContainer) {
      const barcodeElement = barcodeContainer.nativeElement.querySelector('svg');
      if (barcodeElement) {
        // Generate the barcode
        JsBarcode(barcodeElement, doc.document_code, { format: 'CODE128', width: 2, height: 40, displayValue: true });
        
        // Ensure the barcode is rendered before printing
        setTimeout(() => {
          const barcodeSvg = barcodeElement.outerHTML;
          const printWindow = window.open('', '', 'height=600,width=800');
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
              <html>
                <head>
                  <title>Print Barcode</title>
                  <style>
                    body, html {
                      margin: 0;
                      padding: 0;
                      height: 100%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    }
                    svg {
                      max-width: 100%;
                      height: auto;
                    }
                  </style>
                </head>
                <body>
                  ${barcodeSvg}
                </body>
              </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        }, 100); // Adjust the timeout if necessary
      }
    }
  }

  releaseDocuments(): void {
    this.router.navigate(['user/document-release']);
  }
}

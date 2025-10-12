import { Injectable } from '@nestjs/common';

@Injectable()
export class SwaggerDocumentService {
  private document: any = null;

  setDocument(doc: any) {
    this.document = doc;
  }

  getDocument() {
    return this.document;
  }
}


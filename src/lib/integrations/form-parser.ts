/**
 * Cross-Platform Form Parser - Universal form parsing for different platforms
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 *
 * Supports:
 * - HTML form parsing (DOM traversal)
 * - JSON schema parsing (Typeform, JotForm API)
 * - PDF form field extraction
 * - Dynamic field detection (JavaScript-generated forms)
 */

import { JSDOM } from 'jsdom';
import { z } from 'zod';
import * as pdf from 'pdf-parse';

// Universal form schemas
const FieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  type: z.string(),
  required: z.boolean(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  validation: z
    .array(
      z.object({
        type: z.string(),
        value: z.unknown(),
        message: z.string().optional(),
      }),
    )
    .optional(),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
        selected: z.boolean().optional(),
      }),
    )
    .optional(),
  conditional: z
    .object({
      dependsOn: z.string(),
      condition: z.string(),
      value: z.unknown(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ParsedFormSchema = z.object({
  id: z.string(),
  platform: z.enum([
    'typeform',
    'google_forms',
    'jotform',
    'custom_html',
    'gravity_forms',
    'pdf',
  ]),
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(FieldDefinitionSchema),
  styling: z
    .object({
      theme: z.string().optional(),
      customCSS: z.string().optional(),
      layout: z.string().optional(),
    })
    .optional(),
  logic: z
    .array(
      z.object({
        type: z.string(),
        condition: z.string(),
        action: z.string(),
        target: z.string(),
      }),
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
type ParsedForm = z.infer<typeof ParsedFormSchema>;

interface FormParser {
  parseHTML(html: string, baseUrl?: string): Promise<ParsedForm>;
  parseJSON(json: any, platform: string): Promise<ParsedForm>;
  parsePDF(pdfBuffer: Buffer): Promise<ParsedForm>;
  extractFieldTypes(fields: any[]): FieldDefinition[];
  normalizeFieldNames(fields: FieldDefinition[]): FieldDefinition[];
}

interface PlatformParser {
  canParse(data: any): boolean;
  parse(data: any): Promise<ParsedForm>;
  extractFields(data: any): FieldDefinition[];
  extractLogic(data: any): any[];
  extractStyling(data: any): any;
}

export class UniversalFormParser implements FormParser {
  private platformParsers: Map<string, PlatformParser> = new Map();
  private fieldTypeMap: Map<string, string> = new Map();

  constructor() {
    this.initializePlatformParsers();
    this.initializeFieldTypeMap();
  }

  async parseHTML(html: string, baseUrl?: string): Promise<ParsedForm> {
    try {
      const dom = new JSDOM(html, { url: baseUrl });
      const document = dom.window.document;

      // Find form elements
      const forms = document.querySelectorAll('form');
      if (forms.length === 0) {
        throw new Error('No form elements found in HTML');
      }

      // Use the first form or find the most relevant one
      const form = this.selectBestForm(forms);

      const parsedForm: ParsedForm = {
        id: form.id || this.generateFormId(form),
        platform: 'custom_html',
        title: this.extractFormTitle(document, form),
        description: this.extractFormDescription(document, form),
        fields: this.extractHtmlFields(form),
        styling: this.extractHtmlStyling(document, form),
        logic: this.extractHtmlLogic(form),
        metadata: {
          action: form.action || '',
          method: (form.method || 'POST').toUpperCase(),
          enctype: form.enctype || 'application/x-www-form-urlencoded',
          parsedAt: new Date().toISOString(),
          baseUrl,
        },
      };

      // Validate and normalize
      this.validateParsedForm(parsedForm);
      return parsedForm;
    } catch (error) {
      throw new Error(
        `HTML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async parseJSON(json: any, platform: string): Promise<ParsedForm> {
    try {
      const parser = this.platformParsers.get(platform);
      if (!parser) {
        throw new Error(`No parser available for platform: ${platform}`);
      }

      if (!parser.canParse(json)) {
        throw new Error(`Data format not compatible with ${platform} parser`);
      }

      const parsedForm = await parser.parse(json);

      // Validate and normalize
      this.validateParsedForm(parsedForm);
      return parsedForm;
    } catch (error) {
      throw new Error(
        `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async parsePDF(pdfBuffer: Buffer): Promise<ParsedForm> {
    try {
      const pdfData = await pdf(pdfBuffer);

      // Extract text content and try to identify form fields
      const text = pdfData.text;
      const fields = this.extractPdfFields(text, pdfData);

      const parsedForm: ParsedForm = {
        id: this.generateId('pdf_form'),
        platform: 'pdf',
        title: this.extractPdfTitle(text),
        description: this.extractPdfDescription(text),
        fields: fields,
        metadata: {
          pageCount: pdfData.numpages,
          parsedAt: new Date().toISOString(),
          textLength: text.length,
        },
      };

      this.validateParsedForm(parsedForm);
      return parsedForm;
    } catch (error) {
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  extractFieldTypes(fields: any[]): FieldDefinition[] {
    return fields.map((field, index) => this.normalizeField(field, index));
  }

  normalizeFieldNames(fields: FieldDefinition[]): FieldDefinition[] {
    return fields.map((field) => ({
      ...field,
      name: this.sanitizeFieldName(field.name),
      title: this.cleanFieldTitle(field.title),
    }));
  }

  // HTML parsing methods
  private selectBestForm(forms: NodeListOf<Element>): Element {
    // Prefer forms with IDs, classes, or more fields
    const formArray = Array.from(forms);

    return formArray.reduce((best, current) => {
      const bestScore = this.scoreForm(best);
      const currentScore = this.scoreForm(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private scoreForm(form: Element): number {
    let score = 0;

    // Has ID
    if (form.id) score += 10;

    // Has class
    if (form.className) score += 5;

    // Number of fields
    const fields = form.querySelectorAll('input, select, textarea');
    score += fields.length;

    // Has action URL
    if (form.getAttribute('action')) score += 3;

    return score;
  }

  private extractFormTitle(document: Document, form: Element): string {
    // Try various methods to find form title
    const titleSelectors = [
      'h1',
      'h2',
      'h3',
      '.form-title',
      '.title',
      '.form-header h1',
      '.form-header h2',
      '.form-header h3',
      'legend',
    ];

    // Look for title in form first
    for (const selector of titleSelectors) {
      const element = form.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Look in document
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback to page title
    const pageTitle = document.querySelector('title')?.textContent?.trim();
    return pageTitle || 'Untitled Form';
  }

  private extractFormDescription(document: Document, form: Element): string {
    const descSelectors = [
      '.form-description',
      '.description',
      '.form-intro',
      '.form-header p',
      'p.lead',
      '.subtitle',
    ];

    for (const selector of descSelectors) {
      const element =
        form.querySelector(selector) || document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractHtmlFields(form: Element): FieldDefinition[] {
    const fieldElements = form.querySelectorAll(
      'input:not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea',
    );

    return Array.from(fieldElements)
      .map((element, index) => {
        return this.parseHtmlField(element, index);
      })
      .filter(Boolean) as FieldDefinition[];
  }

  private parseHtmlField(
    element: Element,
    index: number,
  ): FieldDefinition | null {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type') || tagName;
    const name = element.getAttribute('name');
    const id = element.getAttribute('id') || `field_${index}`;

    if (!name && !id) return null;

    // Find associated label
    const label = this.findFieldLabel(element, id);

    const field: FieldDefinition = {
      id: id,
      name: name || id,
      title: label || name || `Field ${index + 1}`,
      type: this.normalizeFieldType(type),
      required: element.hasAttribute('required'),
      placeholder: element.getAttribute('placeholder') || undefined,
      helpText: this.findFieldHelp(element),
      validation: this.extractHtmlValidation(element),
      options: this.extractFieldOptions(element),
      metadata: {
        originalType: type,
        tagName: tagName,
        className: element.className,
      },
    };

    return field;
  }

  private findFieldLabel(element: Element, fieldId: string): string {
    // Try label[for] attribute
    if (fieldId) {
      const label = element.ownerDocument?.querySelector(
        `label[for="${fieldId}"]`,
      );
      if (label?.textContent?.trim()) {
        return label.textContent.trim();
      }
    }

    // Try parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent
        ?.replace(element.textContent || '', '')
        .trim();
      if (labelText) return labelText;
    }

    // Try preceding label
    let prev = element.previousElementSibling;
    while (prev) {
      if (prev.tagName.toLowerCase() === 'label') {
        return prev.textContent?.trim() || '';
      }
      prev = prev.previousElementSibling;
    }

    // Try data attributes
    const dataLabel =
      element.getAttribute('data-label') ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title');

    return dataLabel || '';
  }

  private findFieldHelp(element: Element): string | undefined {
    const helpSelectors = [
      '.help-text',
      '.field-help',
      '.description',
      '[data-help]',
      '.form-text',
      '.help-block',
    ];

    // Look for help text near the field
    const parent = element.parentElement;
    if (parent) {
      for (const selector of helpSelectors) {
        const helpElement = parent.querySelector(selector);
        if (helpElement?.textContent?.trim()) {
          return helpElement.textContent.trim();
        }
      }
    }

    // Check data attributes
    return (
      element.getAttribute('data-help') ||
      element.getAttribute('title') ||
      undefined
    );
  }

  private extractHtmlValidation(
    element: Element,
  ): Array<{ type: string; value: any; message?: string }> {
    const validations = [];

    // HTML5 validation attributes
    if (element.hasAttribute('required')) {
      validations.push({
        type: 'required',
        value: true,
        message:
          element.getAttribute('data-required-message') ||
          'This field is required',
      });
    }

    if (element.hasAttribute('minlength')) {
      validations.push({
        type: 'minlength',
        value: parseInt(element.getAttribute('minlength') || '0'),
      });
    }

    if (element.hasAttribute('maxlength')) {
      validations.push({
        type: 'maxlength',
        value: parseInt(element.getAttribute('maxlength') || '0'),
      });
    }

    if (element.hasAttribute('pattern')) {
      validations.push({
        type: 'pattern',
        value: element.getAttribute('pattern'),
      });
    }

    if (element.hasAttribute('min')) {
      validations.push({
        type: 'min',
        value: element.getAttribute('min'),
      });
    }

    if (element.hasAttribute('max')) {
      validations.push({
        type: 'max',
        value: element.getAttribute('max'),
      });
    }

    return validations;
  }

  private extractFieldOptions(
    element: Element,
  ): Array<{ id: string; label: string; value: string; selected?: boolean }> {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');

    if (tagName === 'select') {
      const options = element.querySelectorAll('option');
      return Array.from(options).map((option, index) => ({
        id: option.getAttribute('value') || `option_${index}`,
        label: option.textContent?.trim() || `Option ${index + 1}`,
        value: option.getAttribute('value') || option.textContent?.trim() || '',
        selected: option.hasAttribute('selected'),
      }));
    }

    if (type === 'radio' || type === 'checkbox') {
      const name = element.getAttribute('name');
      if (name) {
        const relatedInputs = element.ownerDocument?.querySelectorAll(
          `input[name="${name}"]`,
        );
        if (relatedInputs) {
          return Array.from(relatedInputs).map((input, index) => ({
            id: input.getAttribute('value') || `option_${index}`,
            label:
              this.findFieldLabel(input, input.getAttribute('id') || '') ||
              input.getAttribute('value') ||
              `Option ${index + 1}`,
            value: input.getAttribute('value') || '',
            selected: input.hasAttribute('checked'),
          }));
        }
      }
    }

    return [];
  }

  private extractHtmlStyling(document: Document, form: Element): any {
    return {
      customCSS: this.extractRelevantCSS(document, form),
      layout: this.detectFormLayout(form),
      theme: this.detectTheme(document, form),
    };
  }

  private extractHtmlLogic(form: Element): any[] {
    // Extract conditional logic from data attributes or JavaScript
    const logic = [];

    const fieldsWithConditions = form.querySelectorAll('[data-condition]');
    fieldsWithConditions.forEach((field) => {
      const condition = field.getAttribute('data-condition');
      if (condition) {
        logic.push({
          type: 'conditional',
          condition: condition,
          action: 'show',
          target: field.getAttribute('name') || field.getAttribute('id'),
        });
      }
    });

    return logic;
  }

  // PDF parsing methods
  private extractPdfFields(text: string, pdfData: any): FieldDefinition[] {
    const fields = [];
    const lines = text.split('\n');

    // Look for common form field patterns
    const fieldPatterns = [
      { pattern: /^(.+?):\s*_+\s*$/, type: 'text' },
      { pattern: /^(.+?):\s*\[\s*\]\s*(.+?)$/, type: 'checkbox' },
      { pattern: /^(.+?):\s*\(\s*\)\s*(.+?)$/, type: 'radio' },
      { pattern: /^(.+?):\s*Date:\s*\/\s*\/\s*$/, type: 'date' },
      { pattern: /^(.+?):\s*\$\s*_+\s*$/, type: 'number' },
    ];

    lines.forEach((line, index) => {
      for (const { pattern, type } of fieldPatterns) {
        const match = line.trim().match(pattern);
        if (match) {
          fields.push({
            id: `pdf_field_${index}`,
            name: `pdf_field_${index}`,
            title: match[1].trim(),
            type: type,
            required: line.includes('*') || line.includes('(required)'),
            metadata: {
              lineNumber: index + 1,
              originalText: line,
            },
          });
          break;
        }
      }
    });

    return fields;
  }

  private extractPdfTitle(text: string): string {
    const lines = text.split('\n');
    // First non-empty line is usually the title
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 3) {
        return trimmed;
      }
    }
    return 'PDF Form';
  }

  private extractPdfDescription(text: string): string {
    const lines = text.split('\n');
    const titleLine = lines.findIndex((line) => line.trim().length > 3);

    if (titleLine !== -1 && titleLine + 1 < lines.length) {
      const descLine = lines[titleLine + 1].trim();
      if (descLine && !descLine.includes(':') && !descLine.includes('_')) {
        return descLine;
      }
    }

    return '';
  }

  // Platform parsers initialization
  private initializePlatformParsers(): void {
    this.platformParsers.set('typeform', new TypeformParser());
    this.platformParsers.set('google_forms', new GoogleFormsParser());
    this.platformParsers.set('jotform', new JotFormParser());
    this.platformParsers.set('gravity_forms', new GravityFormsParser());
  }

  private initializeFieldTypeMap(): void {
    const typeMap = new Map([
      // HTML types
      ['text', 'text'],
      ['email', 'email'],
      ['password', 'password'],
      ['tel', 'phone'],
      ['url', 'url'],
      ['number', 'number'],
      ['date', 'date'],
      ['datetime-local', 'datetime'],
      ['time', 'time'],
      ['color', 'color'],
      ['range', 'slider'],
      ['file', 'file'],
      ['hidden', 'hidden'],
      ['radio', 'radio'],
      ['checkbox', 'checkbox'],
      ['select', 'select'],
      ['textarea', 'textarea'],

      // Platform-specific types
      ['short_text', 'text'],
      ['long_text', 'textarea'],
      ['multiple_choice', 'radio'],
      ['dropdown', 'select'],
      ['yes_no', 'radio'],
      ['rating', 'rating'],
      ['opinion_scale', 'slider'],
      ['file_upload', 'file'],
      ['phone_number', 'phone'],
      ['website', 'url'],
    ]);

    this.fieldTypeMap = typeMap;
  }

  // Utility methods
  private normalizeFieldType(type: string): string {
    return this.fieldTypeMap.get(type.toLowerCase()) || 'text';
  }

  private normalizeField(field: any, index: number): FieldDefinition {
    return {
      id: field.id || `field_${index}`,
      name: field.name || field.id || `field_${index}`,
      title: field.title || field.label || field.name || `Field ${index + 1}`,
      type: this.normalizeFieldType(field.type || 'text'),
      required: Boolean(field.required),
      placeholder: field.placeholder,
      helpText: field.helpText || field.description,
      validation: field.validation || [],
      options: field.options || [],
      conditional: field.conditional,
      metadata: field.metadata || {},
    };
  }

  private sanitizeFieldName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  private cleanFieldTitle(title: string): string {
    return title
      .replace(/^\*+\s*/, '')
      .replace(/\s*\*+$/, '')
      .trim();
  }

  private generateFormId(form: Element): string {
    const action = form.getAttribute('action') || '';
    const hash = this.simpleHash(action + form.innerHTML.substring(0, 100));
    return `form_${hash}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private validateParsedForm(form: ParsedForm): void {
    try {
      ParsedFormSchema.parse(form);
    } catch (error) {
      throw new Error(
        `Form validation failed: ${error instanceof Error ? error.message : 'Invalid form structure'}`,
      );
    }
  }

  private extractRelevantCSS(document: Document, form: Element): string {
    // Extract CSS rules that might affect the form
    const stylesheets = document.querySelectorAll(
      'style, link[rel="stylesheet"]',
    );
    // This is a simplified version - in production, you'd want to parse CSS more thoroughly
    return Array.from(stylesheets)
      .map((sheet) => sheet.textContent || '')
      .join('\n');
  }

  private detectFormLayout(form: Element): string {
    const hasGrid =
      form.className.includes('grid') ||
      form.querySelector('.grid, .row, .columns');
    const hasTable = form.querySelector('table');
    const hasFieldsets = form.querySelectorAll('fieldset').length > 1;

    if (hasTable) return 'table';
    if (hasGrid) return 'grid';
    if (hasFieldsets) return 'sections';
    return 'linear';
  }

  private detectTheme(document: Document, form: Element): string {
    // Simple theme detection based on class names
    const classes = document.body.className + ' ' + form.className;

    if (classes.includes('dark')) return 'dark';
    if (classes.includes('bootstrap')) return 'bootstrap';
    if (classes.includes('material')) return 'material';
    if (classes.includes('tailwind')) return 'tailwind';

    return 'default';
  }
}

// Platform-specific parsers (simplified implementations)
class TypeformParser implements PlatformParser {
  canParse(data: any): boolean {
    return data && (data.id || data.form_id) && (data.fields || data.questions);
  }

  async parse(data: any): Promise<ParsedForm> {
    return {
      id: data.id,
      platform: 'typeform',
      title: data.title,
      description: data.description,
      fields: this.extractFields(data),
      logic: this.extractLogic(data),
      styling: this.extractStyling(data),
      metadata: data.metadata || {},
    };
  }

  extractFields(data: any): FieldDefinition[] {
    return (data.fields || []).map((field: any, index: number) => ({
      id: field.id,
      name: field.id,
      title: field.title,
      type: this.mapTypeformFieldType(field.type),
      required: field.validations?.required || false,
      options:
        field.properties?.choices?.map((choice: any) => ({
          id: choice.id,
          label: choice.label,
          value: choice.id,
        })) || [],
      validation: field.validations
        ? [{ type: 'required', value: field.validations.required }]
        : [],
      metadata: { originalType: field.type },
    }));
  }

  extractLogic(data: any): any[] {
    return data.logic || [];
  }

  extractStyling(data: any): any {
    return data.theme || {};
  }

  private mapTypeformFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      short_text: 'text',
      long_text: 'textarea',
      multiple_choice: 'radio',
      email: 'email',
      number: 'number',
      date: 'date',
      yes_no: 'radio',
      dropdown: 'select',
      file_upload: 'file',
    };
    return typeMap[type] || 'text';
  }
}

class GoogleFormsParser implements PlatformParser {
  canParse(data: any): boolean {
    return data && data.formId && (data.items || data.questions);
  }

  async parse(data: any): Promise<ParsedForm> {
    return {
      id: data.formId,
      platform: 'google_forms',
      title: data.info?.title || data.title,
      description: data.info?.description || data.description,
      fields: this.extractFields(data),
      logic: this.extractLogic(data),
      styling: this.extractStyling(data),
      metadata: data.metadata || {},
    };
  }

  extractFields(data: any): FieldDefinition[] {
    return (data.items || []).map((item: any, index: number) => ({
      id: item.itemId || `item_${index}`,
      name: item.itemId || `item_${index}`,
      title: item.title,
      type: this.mapGoogleFormsFieldType(item),
      required: item.questionItem?.question?.required || false,
      options: this.extractGoogleFormsOptions(item),
      metadata: { originalType: item.questionItem?.question?.questionType },
    }));
  }

  extractLogic(data: any): any[] {
    return [];
  }

  extractStyling(data: any): any {
    return {};
  }

  private mapGoogleFormsFieldType(item: any): string {
    const question = item.questionItem?.question;
    if (!question) return 'text';

    if (question.textQuestion) return 'text';
    if (question.paragraphTextQuestion) return 'textarea';
    if (question.multipleChoiceQuestion) return 'radio';
    if (question.checkboxQuestion) return 'checkbox';
    if (question.dropdownQuestion) return 'select';
    if (question.scaleQuestion) return 'slider';
    if (question.dateQuestion) return 'date';
    if (question.timeQuestion) return 'time';

    return 'text';
  }

  private extractGoogleFormsOptions(
    item: any,
  ): Array<{ id: string; label: string; value: string }> {
    const question = item.questionItem?.question;
    const options =
      question?.multipleChoiceQuestion?.options ||
      question?.checkboxQuestion?.options ||
      question?.dropdownQuestion?.options ||
      [];

    return options.map((option: any, index: number) => ({
      id: `option_${index}`,
      label: option.value,
      value: option.value,
    }));
  }
}

class JotFormParser implements PlatformParser {
  canParse(data: any): boolean {
    return data && (data.id || data.formID) && (data.questions || data.fields);
  }

  async parse(data: any): Promise<ParsedForm> {
    return {
      id: data.id || data.formID,
      platform: 'jotform',
      title: data.title,
      description: data.description,
      fields: this.extractFields(data),
      logic: this.extractLogic(data),
      styling: this.extractStyling(data),
      metadata: data.metadata || {},
    };
  }

  extractFields(data: any): FieldDefinition[] {
    const questions = data.questions || {};
    return Object.values(questions).map((question: any) => ({
      id: question.qid,
      name: question.name || question.qid,
      title: question.text,
      type: this.mapJotFormFieldType(question.type),
      required: question.required === 'Yes',
      options: this.extractJotFormOptions(question),
      metadata: { originalType: question.type },
    }));
  }

  extractLogic(data: any): any[] {
    return [];
  }

  extractStyling(data: any): any {
    return {};
  }

  private mapJotFormFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      control_textbox: 'text',
      control_textarea: 'textarea',
      control_email: 'email',
      control_number: 'number',
      control_radio: 'radio',
      control_checkbox: 'checkbox',
      control_dropdown: 'select',
      control_fileupload: 'file',
      control_datetime: 'datetime',
    };
    return typeMap[type] || 'text';
  }

  private extractJotFormOptions(
    question: any,
  ): Array<{ id: string; label: string; value: string }> {
    if (question.options && typeof question.options === 'string') {
      return question.options
        .split('|')
        .map((option: string, index: number) => ({
          id: `option_${index}`,
          label: option.trim(),
          value: option.trim(),
        }));
    }
    return [];
  }
}

class GravityFormsParser implements PlatformParser {
  canParse(data: any): boolean {
    return data && data.id && data.fields && Array.isArray(data.fields);
  }

  async parse(data: any): Promise<ParsedForm> {
    return {
      id: data.id,
      platform: 'gravity_forms',
      title: data.title,
      description: data.description,
      fields: this.extractFields(data),
      logic: this.extractLogic(data),
      styling: this.extractStyling(data),
      metadata: {
        version: data.version,
        isActive: data.is_active,
        ...data.metadata,
      },
    };
  }

  extractFields(data: any): FieldDefinition[] {
    return (data.fields || []).map((field: any) => ({
      id: field.id.toString(),
      name: field.adminLabel || field.label || `field_${field.id}`,
      title: field.label,
      type: this.mapGravityFormsFieldType(field.type),
      required: field.isRequired || false,
      placeholder: field.placeholder,
      helpText: field.description,
      options: this.extractGravityFormsOptions(field),
      metadata: {
        originalType: field.type,
        adminLabel: field.adminLabel,
        cssClass: field.cssClass,
      },
    }));
  }

  extractLogic(data: any): any[] {
    return data.conditionalLogic || [];
  }

  extractStyling(data: any): any {
    return data.styling || {};
  }

  private mapGravityFormsFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      text: 'text',
      textarea: 'textarea',
      select: 'select',
      radio: 'radio',
      checkbox: 'checkbox',
      number: 'number',
      email: 'email',
      phone: 'phone',
      website: 'url',
      date: 'date',
      time: 'time',
      fileupload: 'file',
      hidden: 'hidden',
    };
    return typeMap[type] || 'text';
  }

  private extractGravityFormsOptions(
    field: any,
  ): Array<{ id: string; label: string; value: string }> {
    if (!field.choices) return [];

    return field.choices.map((choice: any) => ({
      id: choice.value,
      label: choice.text,
      value: choice.value,
      selected: choice.isSelected,
    }));
  }
}

// Singleton instance
export const universalFormParser = new UniversalFormParser();

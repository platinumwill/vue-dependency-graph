export class Document {
    parseProviderName: string
    content: string

    constructor(content:string, parseProviderName: string) {
        this.content = content
        this.parseProviderName = parseProviderName
    }
}

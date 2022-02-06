import { ModifiedSpacyToken } from "@/composables/sentenceManager"

// 新學寫法的範例
const GoogleMorphologyInfoTypeKeys = ["pos", "lemma", "tense"]
type GoogleMorphologyInfoType = typeof GoogleMorphologyInfoTypeKeys[number]
type GoogleMorphologyInfoTypeProperty = "tag" | "lemma" | "tense"

export class MorphologyInfo {
    private _type: MorphologyInfoType
    private _token: ModifiedSpacyToken
    
    constructor(token: ModifiedSpacyToken, type: MorphologyInfoType) {
        this._type = type
        this._token = token
    }

    get token() {
        return this._token
    }

    get type() {
        return this._type
    }
}

export class MorphologyInfoType {
    name: GoogleMorphologyInfoType
    propertyInWord: GoogleMorphologyInfoTypeProperty
    
    constructor(name: GoogleMorphologyInfoType, propertyInWord: GoogleMorphologyInfoTypeProperty) {
        this.name = name
        this.propertyInWord = propertyInWord
    }

}

export const morphologyInfoTypeEnum = Object.freeze({
    lemma: new MorphologyInfoType('lemma', 'lemma')
    , tense: new MorphologyInfoType('tense', 'tense')
    , pos: new MorphologyInfoType('pos', 'tag')
})

export const minimalMorphologyInfo = morphologyInfoTypeEnum.pos

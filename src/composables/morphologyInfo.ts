import { ModifiedSpacyToken } from "@/composables/sentenceManager"

// 新學寫法的範例
const GoogleMorphologyInfoTypeKeys = ["pos", "lemma", "tense"]
type GoogleMorphologyInfoType = typeof GoogleMorphologyInfoTypeKeys[number]
type GoogleMorphologyInfoTypeProperty = "tag" | "lemma" | "tense"

export class MorphologyInfo {
    name: GoogleMorphologyInfoType
    propertyInWord: GoogleMorphologyInfoTypeProperty
    
    constructor(name: GoogleMorphologyInfoType, propertyInWord: GoogleMorphologyInfoTypeProperty) {
        this.name = name
        this.propertyInWord = propertyInWord
    }

}

export const morphologyInfoTypeEnum = Object.freeze({
    pos: new MorphologyInfo('pos', 'tag')
    , lemma: new MorphologyInfo('lemma', 'lemma')
    , tense: new MorphologyInfo('tense', 'tense')
})

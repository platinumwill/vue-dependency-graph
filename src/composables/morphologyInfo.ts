import { ModifiedSpacyToken } from "@/composables/sentenceManager"

type GoogleMorphologyInfoType = "pos" | "lemma" | "tense"
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

import * as targetPatternPieceManager from '@/composables/targetPatternPieceManager'
import * as sentenceManager from '@/composables/sentenceManager'
import * as graphSentenceManagerResource from '@/composables/graphSentenceManager'

describe('pattern comparison', () => {

    graphSentenceManagerResource.morphologyInfoTypeEnum

    const spacyWord1 = { text: 'sent', tag: 'VERB', lemma: 'send' }
    const token1 = new sentenceManager.ModifiedSpacyToken(spacyWord1, 1)
    token1.selectedMorphologyInfoTypes = [
        graphSentenceManagerResource.morphologyInfoTypeEnum.pos.name
    ]
    const piece1 = new targetPatternPieceManager.LinearTargetPatternPiece(token1)

    const spacyWord2 = { text: 'get', tag: 'VERB', lemma: 'get'}
    const token2 = new sentenceManager.ModifiedSpacyToken(spacyWord2, 3)
    token2.selectedMorphologyInfoTypes = [
        graphSentenceManagerResource.morphologyInfoTypeEnum.pos.name
    ]
    const piece2 = new targetPatternPieceManager.LinearTargetPatternPiece(token2)

    const token3 = new sentenceManager.ModifiedSpacyToken(spacyWord1, 1)
    token3.selectedMorphologyInfoTypes = [
        graphSentenceManagerResource.morphologyInfoTypeEnum.pos.name
        , graphSentenceManagerResource.morphologyInfoTypeEnum.lemma.name
    ]
    const piece3 = new targetPatternPieceManager.LinearTargetPatternPiece()

    it('piece compare equal', () => {
        expect(piece1.equalsForPattern(piece2)).toBe(true)
        expect(piece2.equalsForPattern(piece1)).toBe(true)
    })
    it('piece compare not equal', () => {
        expect(piece1.equalsForPattern(piece3)).toBe(false)
        expect(piece3.equalsForPattern(piece1)).toBe(false)
    })

})
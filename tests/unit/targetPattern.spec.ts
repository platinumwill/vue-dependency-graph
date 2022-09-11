import * as targetPatternPieceManager from '@/composables/targetPattern'
import * as sentenceManager from '@/composables/sentenceManager'
import { morphologyInfoTypeEnum } from "@/composables/morphologyInfo"

describe('pattern comparison', () => {


    const spacyWord1 = { text: 'sent', tag: 'VERB', lemma: 'send' }
    const token1 = new sentenceManager.ModifiedSpacyToken(spacyWord1, 1)
    token1.selectedMorphologyInfoTypes = [
        morphologyInfoTypeEnum.pos
    ]
    const piece1 = new targetPatternPieceManager.LinearTargetPatternPiece(token1)

    const spacyWord2 = { text: 'get', tag: 'VERB', lemma: 'get'}
    const token2 = new sentenceManager.ModifiedSpacyToken(spacyWord2, 3)
    token2.selectedMorphologyInfoTypes = [
        morphologyInfoTypeEnum.pos
    ]
    const piece2 = new targetPatternPieceManager.LinearTargetPatternPiece(token2)

    const token3 = new sentenceManager.ModifiedSpacyToken(spacyWord1, 1)
    token3.selectedMorphologyInfoTypes = [
        morphologyInfoTypeEnum.pos
        , morphologyInfoTypeEnum.lemma
    ]
    const piece3 = new targetPatternPieceManager.LinearTargetPatternPiece()

    const pattern1 = new targetPatternPieceManager.LinearTargetPattern()
    pattern1.addPieces(piece1)
    pattern1.addPieces(piece2)
    const pattern2 = new targetPatternPieceManager.LinearTargetPattern()
    pattern2.addPieces(piece3)
    pattern2.addPieces(piece2)
    const pattern3 = new targetPatternPieceManager.LinearTargetPattern()
    pattern3.addPieces(piece2)
    pattern3.addPieces(piece1)

    it('piece compare equal', () => {
        expect(piece1.equalsForPattern(piece2)).toBe(true)
        expect(piece2.equalsForPattern(piece1)).toBe(true)
    })
    it('piece compare not equal', () => {
        expect(piece1.equalsForPattern(piece3)).toBe(false)
        expect(piece3.equalsForPattern(piece1)).toBe(false)
    })
    it('pattern compare not equal', () => {
        expect(pattern1.piecesEqual(pattern2)).toBe(false)
        expect(pattern2.piecesEqual(pattern1)).toBe(false)
    })
    it('pattern compare equal', () => {
        expect(pattern1.piecesEqual(pattern3)).toBe(true)
        expect(pattern3.piecesEqual(pattern1)).toBe(true)
    })

})
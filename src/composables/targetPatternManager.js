import { ref } from 'vue'

export default function() {

    const targetPatternPieces = ref([])
    const targetPatternPiecesForRevert = []

    return {
        targetPatternData: {
            targetPatternPieces: targetPatternPieces
            , targetPatternPiecesForRevert: targetPatternPiecesForRevert
        }
    }

}

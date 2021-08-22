export default function(sourcePatternManager, targetPattern, spacyFormatSentences) {

    console.log(targetPattern, spacyFormatSentences)

    const selectedSourcePattern = sourcePatternManager.selection.selectedPattern
    const sourcePatternOptions = sourcePatternManager.selection.options

    return {
        sourcePattern: {
            selected: selectedSourcePattern
            , options: sourcePatternOptions.value
        }
    }
}

export function clearSelection(selectedSourcePattern: any) {
    selectedSourcePattern.value = undefined
}

export function clearOptions(sourcePatternOptions: any) {
    sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
}

export function isSourcePatternNew(selectedSourcePattern: any) {
    console.log('source pattern value: ', selectedSourcePattern.value)
    return selectedSourcePattern.value == undefined
}

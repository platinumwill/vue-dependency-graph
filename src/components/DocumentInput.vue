<template>
    <div>
    <Dialog header="Input Document" v-model:visible="displayDocumentInput" :style="{width: '50vw'}" :modal="true">
        <Textarea ref="documentText" v-model="value" rows="10" cols="70" />
        <br/>
        <Button label="Submit" @click="submitDocumentText"/>
    </Dialog>
    </div>
</template>

<script>
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { mapMutations } from 'vuex'

export default {
    data() {
        return {
            displayDocumentInput: true
        }
    }
    , mounted() {
        this.focusTextArea()
    }
    , methods: {
        focusTextArea() {
            this.$refs.documentText.$el.focus()
        }
        , submitDocumentText() {
            this.saveParsedDocument({originalText: 'xxxxxx'})
            this.displayDocumentInput = false
        }
        , ...mapMutations([
            "saveParsedDocument"
        ])
    }
    , components: {
        Dialog
        , Textarea
        , Button
    }
}

</script>

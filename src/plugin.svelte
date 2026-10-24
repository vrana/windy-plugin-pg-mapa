Paragliding Mapa
<script>
import {onDestroy} from 'svelte';
import {init, destroy} from './windy-pgmapa.js';

export const onopen = function () {
	const openInApp = document.getElementById('open-in-app');
	if (openInApp) {
		openInApp.style.display = 'none';
	}
	init();
}

onDestroy(destroy);
</script>

<style lang="less">
.onwindy-plugin-pg-mapa { }
#windy-plugin-pg-mapa { }
</style>

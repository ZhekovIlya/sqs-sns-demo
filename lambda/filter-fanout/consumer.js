exports.handler = async (event) => {
	try {
        console.log(JSON.stringify(event));
		event.Records.forEach(it => console.log(JSON.parse(it.body).Message));
    } catch (e) {
		console.log('error');
    }
};
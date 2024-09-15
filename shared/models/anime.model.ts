export interface AnimeApiResponse {
	data: AnimeData[];
}

export interface AnimeData {
	mal_id: number;
	url: string;
	images: {
		jpg: ImageUrls;
		webp: ImageUrls;
	};
	trailer: {
		youtube_id: string | null;
		url: string | null;
		embed_url: string | null;
	};
	approved: boolean;
	titles: Title[];
	title: string;
	title_english: string;
	title_japanese: string;
	title_synonyms: string[];
	type: 'TV' | string;
	source: string;
	episodes: number;
	status: 'Finished Airing' | string;
	airing: boolean;
	aired: {
		from: string;
		to: string;
		prop: {
			from: DateProp;
			to: DateProp;
			string: string;
		};
	};
	duration: string;
	rating: 'G - All Ages' | string;
	score: number;
	scored_by: number;
	rank: number;
	popularity: number;
	members: number;
	favorites: number;
	synopsis: string;
	background: string;
	season: 'summer' | 'spring' | 'fall' | 'winter';
	year: number;
	broadcast: {
		day: string;
		time: string;
		timezone: string;
		string: string;
	};
	producers: Entity[];
	licensors: Entity[];
	studios: Entity[];
	genres: Entity[];
	explicit_genres: Entity[];
	themes: Entity[];
	demographics: Entity[];
}

interface ImageUrls {
	image_url: string;
	small_image_url: string;
	large_image_url: string;
}

interface Title {
	type: string;
	title: string;
}

interface DateProp {
	day: number;
	month: number;
	year: number;
}

interface Entity {
	mal_id: number;
	type: string;
	name: string;
	url: string;
}

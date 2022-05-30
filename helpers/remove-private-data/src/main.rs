use std::fs;

use clap::Parser;
use rayon::prelude::*;
use walkdir::{DirEntry, WalkDir};

#[derive(Parser)]
#[clap(version, about)]
struct Args {
    #[clap(short, long)]
    root_dir: String,
}

#[derive(serde::Deserialize)]
struct IssueData {
    #[serde(rename = "__WEBCOMPAT_PRIVATE_ISSUE__")]
    is_private: Option<bool>,
}

fn remove_dir_with_private_data(dir: &DirEntry) {
    if !dir.file_type().is_dir() {
        return;
    }

    if let Ok(file) = fs::File::open(dir.path().join("issue.json")) {
        let issue_data: IssueData = serde_json::from_reader(file).unwrap();
        if issue_data.is_private.unwrap_or(false) {
            match fs::remove_dir_all(dir.path()) {
                Ok(_) => println!("Removed {}", dir.path().display()),
                Err(err) => println!(
                    "Could not remove directory {}: {}",
                    dir.path().display(),
                    err
                ),
            }
        }
    } else {
        println!("issue.json not found in directory {}", dir.path().display());
    }
}

fn main() {
    let args = Args::parse();
    let root_dir = fs::canonicalize(&args.root_dir).expect("Invalid root-dir");

    if !root_dir.is_dir() {
        println!("root-dir is not a directory");
        std::process::exit(1);
    }

    WalkDir::new(root_dir)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_entry(|dir| dir.file_type().is_dir())
        .flatten()
        .collect::<Vec<DirEntry>>()
        .par_iter()
        .for_each(remove_dir_with_private_data);
}
